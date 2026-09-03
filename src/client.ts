import * as vscode from 'vscode';
import { ChatCompletionChunk, ChatCompletionRequest, OpenAiModel } from './types';

/**
 * Thin OpenAI-compatible HTTP client (TypeScript port of the `ovh_client.py`
 * chat/model parts from OVHcloudAIEndpointsTester).
 */
export class OpenAiCompatibleClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'vscode-ovhcloud-ai-endpoints',
    };
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/+$/, '')}${path}`;
  }

  async listModels(token?: vscode.CancellationToken): Promise<OpenAiModel[]> {
    const controller = linkAbort(token);
    const res = await fetch(this.url('/models'), { headers: this.headers(), signal: controller.signal });
    if (!res.ok) {
      throw new Error(await describeHttpError(res));
    }
    const json = (await res.json()) as { data?: OpenAiModel[] } | OpenAiModel[];
    const list = Array.isArray(json) ? json : (json.data ?? []);
    return list.filter(m => typeof m.id === 'string');
  }

  /**
   * Streams chat completion chunks parsed from the SSE response.
   */
  async *streamChat(
    body: ChatCompletionRequest,
    token?: vscode.CancellationToken,
  ): AsyncGenerator<ChatCompletionChunk> {
    const controller = linkAbort(token);
    const res = await fetch(this.url('/chat/completions'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ ...body, stream: true }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(await describeHttpError(res));
    }
    if (!res.body) {
      throw new Error('Empty response body from the API.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).replace(/\r$/, '');
          buffer = buffer.slice(newline + 1);
          if (!line.startsWith('data:')) {
            continue;
          }
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') {
            continue;
          }
          try {
            const chunk = JSON.parse(data) as ChatCompletionChunk;
            if (chunk.error?.message) {
              throw new Error(chunk.error.message);
            }
            yield chunk;
          } catch (e) {
            if (e instanceof SyntaxError) {
              continue; // partial/garbage line, ignore
            }
            throw e;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

function linkAbort(token?: vscode.CancellationToken): AbortController {
  const controller = new AbortController();
  token?.onCancellationRequested(() => controller.abort());
  return controller;
}

async function describeHttpError(res: Response): Promise<string> {
  let detail = '';
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
      detail =
        (typeof json.error === 'string' ? json.error : json.error?.message) ?? json.message ?? text;
    } catch {
      detail = text;
    }
  } catch {
    /* ignore */
  }
  const hint =
    res.status === 401 || res.status === 403
      ? ' Check your OVHcloud AI Endpoints token.'
      : res.status === 429
        ? ' Rate limit reached.'
        : '';
  return `OVHcloud AI Endpoints request failed (${res.status} ${res.statusText}).${hint}${detail ? ` ${detail.slice(0, 300)}` : ''}`;
}
