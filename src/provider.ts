import * as vscode from 'vscode';
import { OpenAiCompatibleClient } from './client';
import { toOpenAiMessages, toOpenAiTools } from './messages';
import { ChatCompletionRequest, OpenAiModel } from './types';

export const SECRET_KEY = 'ovhAiEndpoints.accessToken';
export const VENDOR = 'ovhcloud-ai-endpoints';

interface ModelOverride {
  name?: string;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  toolCalling?: boolean;
  imageInput?: boolean;
  hidden?: boolean;
}

const VISION_HINTS = ['vl', 'vision', 'pixtral', 'llava', 'gemma-3', 'mistral-small-3'];

export class OvhChatModelProvider implements vscode.LanguageModelChatProvider {
  private readonly output: vscode.OutputChannel;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.output = vscode.window.createOutputChannel('OVHcloud AI Endpoints');
    context.subscriptions.push(this.output);
  }

  // ---------- configuration helpers ----------

  private get config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('ovhAiEndpoints');
  }

  get baseUrl(): string {
    return this.config.get<string>('baseUrl', 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1');
  }

  async getToken(): Promise<string | undefined> {
    return this.context.secrets.get(SECRET_KEY);
  }

  async promptForToken(): Promise<string | undefined> {
    const value = await vscode.window.showInputBox({
      title: 'OVHcloud AI Endpoints access token',
      prompt: 'Paste your OVHcloud AI Endpoints API token. It is stored in VS Code secret storage.',
      password: true,
      ignoreFocusOut: true,
      placeHolder: 'eyJhbGciOi...',
    });
    if (value && value.trim().length > 0) {
      await this.context.secrets.store(SECRET_KEY, value.trim());
      return value.trim();
    }
    return undefined;
  }

  async clearToken(): Promise<void> {
    await this.context.secrets.delete(SECRET_KEY);
  }

  private async client(interactive: boolean): Promise<OpenAiCompatibleClient | undefined> {
    let token = await this.getToken();
    if (!token && interactive) {
      token = await this.promptForToken();
    }
    if (!token) {
      return undefined;
    }
    return new OpenAiCompatibleClient(this.baseUrl, token);
  }

  // ---------- LanguageModelChatProvider ----------

  async provideLanguageModelChatInformation(
    options: { silent: boolean },
    token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelChatInformation[]> {
    const client = await this.client(!options.silent);
    if (!client) {
      return [];
    }

    let models: OpenAiModel[];
    try {
      models = await client.listModels(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.output.appendLine(`[models] ${message}`);
      if (!options.silent) {
        void vscode.window.showErrorMessage(message);
      }
      return [];
    }

    const overrides = this.config.get<Record<string, ModelOverride>>('modelOverrides', {});
    const hide = this.config
      .get<string[]>('hideModelPatterns', [])
      .map(p => p.toLowerCase())
      .filter(p => p.length > 0);
    const defaultIn = this.config.get<number>('defaultMaxInputTokens', 32768);
    const defaultOut = this.config.get<number>('defaultMaxOutputTokens', 8192);

    const infos: vscode.LanguageModelChatInformation[] = [];
    for (const model of models) {
      const id = model.id;
      const lower = id.toLowerCase();
      const override = overrides[id] ?? {};
      if (override.hidden || hide.some(p => lower.includes(p))) {
        continue;
      }
      const maxInput =
        override.maxInputTokens ?? model.context_length ?? model.max_model_len ?? defaultIn;
      const maxOutput = override.maxOutputTokens ?? model.max_tokens ?? defaultOut;
      const imageInput = override.imageInput ?? VISION_HINTS.some(h => lower.includes(h));
      const toolCalling = override.toolCalling ?? true;

      infos.push({
        id,
        name: override.name ?? id,
        family: VENDOR,
        version: '1.0.0',
        maxInputTokens: maxInput,
        maxOutputTokens: maxOutput,
        capabilities: { imageInput, toolCalling },
        tooltip: `OVHcloud AI Endpoints · ${this.baseUrl}`,
        detail: model.owned_by ? `by ${model.owned_by}` : undefined,
      });
    }

    infos.sort((a, b) => a.name.localeCompare(b.name));
    this.output.appendLine(`[models] ${infos.length} chat model(s) available from ${this.baseUrl}`);
    return infos;
  }

  async provideLanguageModelChatResponse(
    model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const client = await this.client(false);
    if (!client) {
      throw new Error('No OVHcloud AI Endpoints token configured. Run "OVHcloud AI Endpoints: Set API token".');
    }

    const modelOptions = (options.modelOptions ?? {}) as Record<string, unknown>;
    const body: ChatCompletionRequest = {
      model: model.id,
      messages: toOpenAiMessages(messages),
      stream: true,
    };

    const tools = model.capabilities?.toolCalling ? toOpenAiTools(options.tools) : undefined;
    if (tools) {
      body.tools = tools;
      body.tool_choice =
        options.toolMode === vscode.LanguageModelChatToolMode.Required ? 'required' : 'auto';
    }
    if (typeof modelOptions.temperature === 'number') {
      body.temperature = modelOptions.temperature;
    }
    if (typeof modelOptions.top_p === 'number') {
      body.top_p = modelOptions.top_p;
    }
    if (typeof modelOptions.max_tokens === 'number') {
      body.max_tokens = modelOptions.max_tokens;
    } else if (typeof modelOptions.maxOutputTokens === 'number') {
      body.max_tokens = modelOptions.maxOutputTokens;
    }
    if (Array.isArray(modelOptions.stop)) {
      body.stop = modelOptions.stop as string[];
    }

    this.output.appendLine(`[chat] ${model.id} · ${body.messages.length} message(s) · tools=${tools?.length ?? 0}`);

    // Tool calls are streamed as fragments; accumulate them by index.
    const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>();

    const flushToolCalls = () => {
      for (const [, call] of [...pendingToolCalls.entries()].sort((a, b) => a[0] - b[0])) {
        let input: unknown = {};
        if (call.args.trim().length > 0) {
          try {
            input = JSON.parse(call.args);
          } catch {
            input = { _raw: call.args };
          }
        }
        progress.report(new vscode.LanguageModelToolCallPart(call.id, call.name, input as object));
      }
      pendingToolCalls.clear();
    };

    try {
      for await (const chunk of client.streamChat(body, token)) {
        if (token.isCancellationRequested) {
          break;
        }
        const choice = chunk.choices?.[0];
        if (!choice) {
          continue;
        }
        const delta = choice.delta ?? {};

        if (typeof delta.content === 'string' && delta.content.length > 0) {
          progress.report(new vscode.LanguageModelTextPart(delta.content));
        }

        for (const tc of delta.tool_calls ?? []) {
          const idx = tc.index ?? 0;
          const entry = pendingToolCalls.get(idx) ?? { id: '', name: '', args: '' };
          if (tc.id) {
            entry.id = tc.id;
          }
          if (tc.function?.name) {
            entry.name += tc.function.name;
          }
          if (tc.function?.arguments) {
            entry.args += tc.function.arguments;
          }
          pendingToolCalls.set(idx, entry);
        }

        if (choice.finish_reason) {
          flushToolCalls();
        }
      }
      flushToolCalls();
    } catch (err) {
      if (token.isCancellationRequested) {
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.output.appendLine(`[chat] error: ${message}`);
      throw err instanceof Error ? err : new Error(message);
    }
  }

  async provideTokenCount(
    _model: vscode.LanguageModelChatInformation,
    text: string | vscode.LanguageModelChatRequestMessage,
    _token: vscode.CancellationToken,
  ): Promise<number> {
    if (typeof text === 'string') {
      return estimateTokens(text);
    }
    let total = 4; // per-message overhead
    for (const part of text.content) {
      if (part instanceof vscode.LanguageModelTextPart) {
        total += estimateTokens(part.value);
      } else if (part instanceof vscode.LanguageModelToolCallPart) {
        total += estimateTokens(part.name) + estimateTokens(JSON.stringify(part.input ?? {}));
      } else if (part instanceof vscode.LanguageModelToolResultPart) {
        for (const inner of part.content) {
          if (inner instanceof vscode.LanguageModelTextPart) {
            total += estimateTokens(inner.value);
          }
        }
      } else if (part instanceof vscode.LanguageModelDataPart) {
        total += part.mimeType.startsWith('image/') ? 1000 : estimateTokens(String(part.data.length));
      }
    }
    return total;
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
