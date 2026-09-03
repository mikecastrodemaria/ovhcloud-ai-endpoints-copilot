import * as vscode from 'vscode';
import { OpenAiContentPart, OpenAiMessage, OpenAiTool, OpenAiToolCall } from './types';

/** VS Code proposed/future "System" role value; stable API only has User=1 and Assistant=2. */
const SYSTEM_ROLE = 3;

/**
 * Converts VS Code language model messages into OpenAI chat messages.
 * Tool results inside a user message become separate `tool` messages.
 */
export function toOpenAiMessages(
  messages: readonly vscode.LanguageModelChatRequestMessage[],
): OpenAiMessage[] {
  const out: OpenAiMessage[] = [];

  for (const message of messages) {
    const role = message.role as number;

    if (role === SYSTEM_ROLE) {
      out.push({ role: 'system', content: partsToText(message.content) });
      continue;
    }

    if (role === vscode.LanguageModelChatMessageRole.Assistant) {
      const toolCalls: OpenAiToolCall[] = [];
      let text = '';
      for (const part of message.content) {
        if (part instanceof vscode.LanguageModelTextPart) {
          text += part.value;
        } else if (part instanceof vscode.LanguageModelToolCallPart) {
          toolCalls.push({
            id: part.callId,
            type: 'function',
            function: { name: part.name, arguments: JSON.stringify(part.input ?? {}) },
          });
        }
      }
      out.push({
        role: 'assistant',
        content: text.length > 0 ? text : null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });
      continue;
    }

    // User role
    const userParts: OpenAiContentPart[] = [];
    for (const part of message.content) {
      if (part instanceof vscode.LanguageModelTextPart) {
        userParts.push({ type: 'text', text: part.value });
      } else if (part instanceof vscode.LanguageModelDataPart) {
        if (part.mimeType.startsWith('image/')) {
          const b64 = Buffer.from(part.data).toString('base64');
          userParts.push({ type: 'image_url', image_url: { url: `data:${part.mimeType};base64,${b64}` } });
        } else {
          userParts.push({ type: 'text', text: Buffer.from(part.data).toString('utf8') });
        }
      } else if (part instanceof vscode.LanguageModelToolResultPart) {
        // Flush pending user content before the tool message to keep ordering.
        if (userParts.length > 0) {
          out.push({ role: 'user', content: collapse(userParts) });
          userParts.length = 0;
        }
        out.push({ role: 'tool', tool_call_id: part.callId, content: partsToText(part.content) });
      }
    }
    if (userParts.length > 0) {
      out.push({ role: 'user', content: collapse(userParts) });
    }
  }

  return out;
}

export function toOpenAiTools(
  tools: readonly vscode.LanguageModelChatTool[] | undefined,
): OpenAiTool[] | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: (t.inputSchema as object | undefined) ?? { type: 'object', properties: {} },
    },
  }));
}

function collapse(parts: OpenAiContentPart[]): string | OpenAiContentPart[] {
  if (parts.every(p => p.type === 'text')) {
    return parts.map(p => (p.type === 'text' ? p.text : '')).join('');
  }
  return parts;
}

function partsToText(content: readonly unknown[]): string {
  let text = '';
  for (const part of content) {
    if (part instanceof vscode.LanguageModelTextPart) {
      text += part.value;
    } else if (part instanceof vscode.LanguageModelDataPart) {
      if (!part.mimeType.startsWith('image/')) {
        text += Buffer.from(part.data).toString('utf8');
      }
    } else if (typeof part === 'string') {
      text += part;
    }
  }
  return text;
}
