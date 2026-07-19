import {
  AssistantId,
  ConversationDetail,
  NormalizedConversation,
  NormalizedMessage,
  formatZodError,
} from '@/lib/chatTypes';
import { ZodError } from 'zod';

const DEFAULT_BASE = 'https://www.purescan.info/api';
const DEFAULT_TIMEOUT_MS = 45_000;

/** Resolve PersonaAI API root, e.g. http://localhost:3000/api */
export const getChatApiBase = (): string => {
  const explicit =
    process.env.CHAT_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_CHAT_API_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const chatUrl = (process.env.NEXT_PUBLIC_CHAT_API_URL || `${DEFAULT_BASE}/chat`).trim();
  if (chatUrl.endsWith('/api/chat')) return chatUrl.slice(0, -'/chat'.length);
  if (chatUrl.endsWith('/api/v1/chat')) return chatUrl.slice(0, -'/v1/chat'.length);
  if (chatUrl.endsWith('/api')) return chatUrl;
  if (chatUrl.endsWith('/')) return `${chatUrl.slice(0, -1)}/api`;
  return DEFAULT_BASE;
};

export const chatApiUrl = (path: string): string => {
  const base = getChatApiBase();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
};

export const chatAuthHeaders = (apiKey: string): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${apiKey.trim()}`,
  Accept: 'application/json',
});

/** Optional legacy share_link — v1 resolves assistant from API key by default. */
export const resolveAssistantShareLink = (assistant?: string): string | undefined => {
  const fromRequest = typeof assistant === 'string' ? assistant.trim() : '';
  if (fromRequest) return fromRequest;

  const fromEnv =
    process.env.ASSISTANT_SHARE_LINK?.trim() ||
    process.env.NEXT_PUBLIC_ASSISTANT_SHARE_LINK?.trim();
  return fromEnv || undefined;
};

const envKey = (name: string): string => process.env[name]?.trim() || '';

/**
 * Server-only credential map. Clients send assistantId; keys never leave the server.
 * Falls back to legacy NEXT_PUBLIC_* names during migration only.
 */
export const resolveAssistantApiKey = (
  assistantId: AssistantId,
  mode: 'chat' | 'task' = 'chat'
): string | null => {
  if (mode === 'task') {
    if (assistantId !== 'personaai-guide') return null;
    const taskKey =
      envKey('TASK_API_KEY') || envKey('NEXT_PUBLIC_TASK_API_KEY');
    return taskKey || null;
  }

  const byId: Record<AssistantId, string[]> = {
    'personaai-guide': [
      'CHAT_API_KEY',
      'CHAT_API_KEY_1',
      'NEXT_PUBLIC_API_KEY',
      'NEXT_PUBLIC_API_KEY_1',
    ],
    serp: ['CHAT_API_KEY_2', 'NEXT_PUBLIC_API_KEY_2'],
    texniki: ['CHAT_API_KEY_3', 'NEXT_PUBLIC_API_KEY_3'],
    satis: ['CHAT_API_KEY_4', 'NEXT_PUBLIC_API_KEY_4'],
  };

  for (const name of byId[assistantId]) {
    const value = envKey(name);
    if (value) return value;
  }
  return null;
};

export const isAssistantConfigured = (
  assistantId: AssistantId,
  mode: 'chat' | 'task' = 'chat'
): boolean => !!resolveAssistantApiKey(assistantId, mode);

export const listConfiguredAssistants = (): {
  id: AssistantId;
  chatConfigured: boolean;
  taskConfigured: boolean;
}[] => {
  const ids: AssistantId[] = ['personaai-guide', 'serp', 'texniki', 'satis'];
  return ids.map((id) => ({
    id,
    chatConfigured: isAssistantConfigured(id, 'chat'),
    taskConfigured: isAssistantConfigured(id, 'task'),
  }));
};

export const parseJsonResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: text || 'Non-JSON response from upstream' };
  }
};

export const fetchWithTimeout = async (
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Upstream request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export const upstreamJson = async (
  path: string,
  apiKey: string,
  init: RequestInit = {}
): Promise<{ response: Response; data: unknown }> => {
  const response = await fetchWithTimeout(chatApiUrl(path), {
    ...init,
    headers: {
      ...chatAuthHeaders(apiKey),
      ...(init.headers || {}),
    },
  });
  const data = await parseJsonResponse(response);
  return { response, data };
};

export const safeErrorMessage = (error: unknown, fallback = 'Request failed'): string => {
  if (error instanceof ZodError) return formatZodError(error);
  if (error instanceof Error) {
    if (process.env.NODE_ENV === 'production') {
      if (error.message.includes('timed out')) return 'Upstream request timed out';
      return fallback;
    }
    return error.message || fallback;
  }
  return fallback;
};

export const validationErrorResponse = (error: ZodError) => ({
  success: false as const,
  error: formatZodError(error),
  code: 'VALIDATION_ERROR' as const,
});

export const missingAssistantKeyResponse = (assistantId: string, mode: string) => ({
  success: false as const,
  error: `No server API key configured for assistant "${assistantId}" (${mode})`,
  code: 'ASSISTANT_NOT_CONFIGURED' as const,
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const normalizeConversations = (data: unknown): NormalizedConversation[] => {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else {
    const obj = asRecord(data);
    if (Array.isArray(obj?.conversations)) list = obj.conversations as unknown[];
    else if (Array.isArray(obj?.items)) list = obj.items as unknown[];
    else if (Array.isArray(obj?.data)) list = obj.data as unknown[];
  }

  return list
    .map((item): NormalizedConversation | null => {
      const row = asRecord(item);
      if (!row) return null;
      const id = String(row.id || row.conversation_id || '').trim();
      if (!id) return null;
      return {
        id,
        title: String(row.title || row.preview || row.last_message || 'Söhbət'),
        preview:
          typeof row.preview === 'string'
            ? row.preview
            : typeof row.last_message === 'string'
              ? row.last_message
              : undefined,
        updatedAt: String(row.updated_at || row.updatedAt || new Date().toISOString()),
        status: typeof row.status === 'string' ? row.status : 'active',
        satisfaction_rating:
          typeof row.satisfaction_rating === 'number' ? row.satisfaction_rating : null,
      };
    })
    .filter((row): row is NormalizedConversation => !!row);
};

export const normalizeMessages = (data: unknown): NormalizedMessage[] => {
  let list: unknown[] = [];
  const obj = asRecord(data);
  if (Array.isArray(obj?.messages)) list = obj.messages as unknown[];
  else if (Array.isArray(data)) list = data;

  return list.map((item, index): NormalizedMessage => {
    const row = asRecord(item) || {};
    const isAssistant =
      row.role === 'assistant' || row.sender === 'assistant' || row.role === 'bot';
    return {
      id: String(row.id || `remote-${index}`),
      role: isAssistant ? 'assistant' : 'user',
      content: String(row.content || row.message || row.text || ''),
      created_at: String(row.created_at || row.timestamp || new Date().toISOString()),
    };
  });
};

export const extractConversationDetail = (data: unknown): ConversationDetail => {
  const obj = asRecord(data);
  const nested = asRecord(obj?.data) || obj;
  const status =
    typeof nested?.status === 'string'
      ? nested.status
      : typeof obj?.status === 'string'
        ? obj.status
        : 'active';
  const rating =
    typeof nested?.satisfaction_rating === 'number'
      ? nested.satisfaction_rating
      : typeof obj?.satisfaction_rating === 'number'
        ? obj.satisfaction_rating
        : null;

  return {
    messages: normalizeMessages(nested || data),
    status,
    satisfaction_rating: rating,
  };
};

export const isDevDiagnosticsEnabled = (): boolean =>
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_CHAT_DIAGNOSTICS === 'true';
