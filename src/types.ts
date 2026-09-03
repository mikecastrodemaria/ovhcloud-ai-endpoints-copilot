/** Minimal OpenAI-compatible wire types used by the extension. */

export interface OpenAiModel {
  id: string;
  object?: string;
  owned_by?: string;
  /** Some routers expose these non-standard fields. */
  context_length?: number;
  max_model_len?: number;
  max_tokens?: number;
}

export type OpenAiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export type OpenAiMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | OpenAiContentPart[] }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface OpenAiTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: object;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: OpenAiMessage[];
  stream: boolean;
  tools?: OpenAiTool[];
  tool_choice?: 'auto' | 'required' | 'none';
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string[];
}

export interface StreamDelta {
  role?: string;
  content?: string | null;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: 'function';
    function?: { name?: string; arguments?: string };
  }>;
}

export interface ChatCompletionChunk {
  id?: string;
  choices?: Array<{
    index: number;
    delta: StreamDelta;
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
}
