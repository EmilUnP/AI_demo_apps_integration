/**
 * Client helpers for PersonaAI SSE chat (stream: true).
 * Wait for type: "final" before trusting conversation_id, clarification, suggestions, usage.
 */

export type ChatStreamEvent =
  | { type: 'status'; message?: string; [key: string]: unknown }
  | { type: 'delta'; text?: string; [key: string]: unknown }
  | { type: 'handoff'; [key: string]: unknown }
  | { type: 'final'; data?: unknown; [key: string]: unknown }
  | { type: string; [key: string]: unknown };

export type StreamChatHandlers = {
  onStatus?: (event: ChatStreamEvent) => void;
  onDelta?: (text: string, event: ChatStreamEvent) => void;
  onHandoff?: (event: ChatStreamEvent) => void;
  onFinal?: (data: unknown, event: ChatStreamEvent) => void;
  signal?: AbortSignal;
};

const parseSseChunk = (part: string): ChatStreamEvent | null => {
  const line = part.split('\n').find((l) => l.startsWith('data: '));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(6)) as ChatStreamEvent;
  } catch {
    return null;
  }
};

/** Consume an SSE Response body; returns the final event payload (or null). */
export const consumeChatSse = async (
  response: Response,
  handlers: StreamChatHandlers = {}
): Promise<unknown> => {
  if (!response.body) throw new Error('No response body for SSE stream');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalData: unknown = null;

  while (true) {
    if (handlers.signal?.aborted) {
      await reader.cancel();
      throw new DOMException('Aborted', 'AbortError');
    }
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      const event = parseSseChunk(part);
      if (!event) continue;
      if (event.type === 'status') handlers.onStatus?.(event);
      if (event.type === 'delta') handlers.onDelta?.(String(event.text || ''), event);
      if (event.type === 'handoff') handlers.onHandoff?.(event);
      if (event.type === 'final') {
        finalData = event.data ?? event;
        handlers.onFinal?.(finalData, event);
      }
    }
  }

  if (buffer.trim()) {
    const event = parseSseChunk(buffer);
    if (event?.type === 'final') {
      finalData = event.data ?? event;
      handlers.onFinal?.(finalData, event);
    }
  }

  return finalData;
};

export const isSseContentType = (contentType: string | null): boolean =>
  !!contentType && contentType.includes('text/event-stream');
