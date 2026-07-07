const DEFAULT_BASE = 'https://www.purescan.info/api';

/** Resolve PersonaAI API root, e.g. http://localhost:3000/api */
export const getChatApiBase = (): string => {
  const explicit =
    process.env.CHAT_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_CHAT_API_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const chatUrl = (process.env.NEXT_PUBLIC_CHAT_API_URL || `${DEFAULT_BASE}/chat`).trim();
  if (chatUrl.endsWith('/api/chat')) return chatUrl.slice(0, -'/chat'.length);
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
