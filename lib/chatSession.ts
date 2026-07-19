export interface ChatUser {
  name: string;
  email: string;
  visitorId: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  preview?: string;
  updatedAt: string;
  assistantId: string;
  status?: 'active' | 'completed' | string;
  satisfaction_rating?: number | null;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{ title: string; url?: string; page?: string }>;
  feedback?: 'up' | 'down';
}

const USER_KEY = 'purescan_chat_user';
const CONVERSATIONS_KEY = 'purescan_chat_conversations';
const MESSAGES_PREFIX = 'purescan_chat_messages_';

export const createVisitorId = (): string =>
  `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export const loadChatUser = (): ChatUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatUser;
    if (!parsed?.visitorId) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveChatUser = (user: ChatUser): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearChatUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

export const loadConversationSummaries = (assistantId: string): ConversationSummary[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as ConversationSummary[];
    return all.filter((c) => c.assistantId === assistantId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
};

export const upsertConversationSummary = (summary: ConversationSummary): void => {
  let all: ConversationSummary[] = [];
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (raw) all = JSON.parse(raw) as ConversationSummary[];
  } catch {
    all = [];
  }

  const withoutCurrent = all.filter((c) => c.id !== summary.id);
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([summary, ...withoutCurrent]));
};

export const loadStoredMessages = (conversationId: string): StoredMessage[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MESSAGES_PREFIX + conversationId);
    if (!raw) return [];
    return JSON.parse(raw) as StoredMessage[];
  } catch {
    return [];
  }
};

export const saveStoredMessages = (conversationId: string, messages: StoredMessage[]): void => {
  localStorage.setItem(MESSAGES_PREFIX + conversationId, JSON.stringify(messages));
};

export const toStoredMessage = (message: {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{ title: string; url?: string; page?: string }>;
  feedback?: 'up' | 'down';
}): StoredMessage => ({
  id: message.id,
  role: message.role,
  content: message.content,
  timestamp: message.timestamp.toISOString(),
  sources: message.sources,
  feedback: message.feedback,
});

export const fromStoredMessage = (message: StoredMessage) => ({
  id: message.id,
  role: message.role,
  content: message.content,
  timestamp: new Date(message.timestamp),
  sources: message.sources,
  feedback: message.feedback,
});
