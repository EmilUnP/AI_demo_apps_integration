const DEFAULT_BASE = 'https://www.purescan.info/api';

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

export const parseJsonResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: text };
  }
};
