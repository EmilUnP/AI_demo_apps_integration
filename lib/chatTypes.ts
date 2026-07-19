import { z } from 'zod';

export const CHAT_LANGUAGES = ['auto', 'az', 'en', 'ru'] as const;
export type ChatLanguage = (typeof CHAT_LANGUAGES)[number];

export const CHAT_LANGUAGE_OPTIONS: { value: ChatLanguage; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'az', label: 'Azərbaycan' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
];

export const STT_LANGUAGES = ['az', 'en', 'ru', 'tr'] as const;
export type SttLanguage = (typeof STT_LANGUAGES)[number];

export const STT_FORMATS = ['webm', 'mp4', 'wav', 'mp3', 'ogg', 'm4a'] as const;
export type SttFormat = (typeof STT_FORMATS)[number];

export const TTS_GENDERS = ['female', 'male'] as const;
export type TtsGender = (typeof TTS_GENDERS)[number];

export const ASSISTANT_IDS = ['personaai-guide', 'serp', 'texniki', 'satis'] as const;
export type AssistantId = (typeof ASSISTANT_IDS)[number];

export const RESPONSE_TYPES = ['answer', 'clarification', 'no_answer'] as const;
export type ChatResponseType = (typeof RESPONSE_TYPES)[number];

export const chatLanguageSchema = z.enum(CHAT_LANGUAGES);
export const ttsGenderSchema = z.enum(TTS_GENDERS);
export const assistantIdSchema = z.enum(ASSISTANT_IDS);
export const assistantModeSchema = z.enum(['chat', 'task']);
export const sttFormatSchema = z.enum(STT_FORMATS);
export const sttLanguageSchema = z.enum(STT_LANGUAGES);

const trimmedString = (max: number) =>
  z.string().trim().min(1).max(max);

export const clarificationOptionSchema = z.object({
  id: z.string().trim().min(1).max(200),
  label: z.string().trim().min(1).max(500),
});

export type ClarificationOption = z.infer<typeof clarificationOptionSchema>;

export const suggestionSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  label: z.string().trim().min(1).max(500).optional(),
});

export type ChatSuggestion = z.infer<typeof suggestionSchema>;

export const chatProxyRequestSchema = z
  .object({
    message: trimmedString(8000),
    assistantId: assistantIdSchema,
    assistantMode: assistantModeSchema.optional().default('chat'),
    language: chatLanguageSchema.optional(),
    external_user_id: z.string().trim().min(1).max(200).optional(),
    external_user_name: z.string().trim().min(1).max(200).optional(),
    external_user_email: z.string().trim().email().max(320).optional(),
    conversation_id: z.string().trim().min(1).max(120).optional(),
    new_conversation: z.boolean().optional(),
    /** Creativity 0–1 (API v2.7+) */
    temperature: z.number().min(0).max(1).optional(),
    max_tokens: z.number().int().min(1).max(4000).optional(),
    stream: z.boolean().optional(),
    /** Adaptive RAG — preferred field from clarification.options[].id */
    option_id: z.string().trim().min(1).max(200).optional(),
    /** Alias for option_id */
    clarification_option_id: z.string().trim().min(1).max(200).optional(),
    /** Optional legacy share slug — must match key’s assistant or upstream returns 403 */
    assistant: z.string().trim().min(1).max(200).optional(),
    apiTestOptions: z
      .object({
        includeChatLanguage: z.boolean().optional(),
        includeExternalUserId: z.boolean().optional(),
        includeExternalUserName: z.boolean().optional(),
        includeExternalUserEmail: z.boolean().optional(),
        includeConversationMemory: z.boolean().optional(),
        includeTtsLanguage: z.boolean().optional(),
        includeTtsGender: z.boolean().optional(),
      })
      .optional(),
    includeTestDebug: z.boolean().optional(),
  })
  .strict();

export type ChatProxyRequest = z.infer<typeof chatProxyRequestSchema>;

export const feedbackProxyRequestSchema = z
  .object({
    assistantId: assistantIdSchema,
    conversation_id: trimmedString(120),
    rating: z.number().int().min(1).max(5).optional(),
    /** Alias for rating */
    satisfaction_rating: z.number().int().min(1).max(5).optional(),
    feedback_text: z.string().trim().max(2000).optional(),
    helpful: z.boolean().optional(),
    skip_rating: z.boolean().optional(),
    includeTestDebug: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const score = data.rating ?? data.satisfaction_rating;
    if (data.skip_rating !== true && score == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'rating (or satisfaction_rating) is required unless skip_rating is true',
        path: ['rating'],
      });
    }
  });

export type FeedbackProxyRequest = z.infer<typeof feedbackProxyRequestSchema>;

export const ttsProxyRequestSchema = z
  .object({
    text: trimmedString(4000),
    assistantId: assistantIdSchema,
    language: chatLanguageSchema.optional(),
    gender: ttsGenderSchema.optional(),
    assistant: z.string().trim().min(1).max(200).optional(),
    apiTestOptions: z
      .object({
        includeTtsLanguage: z.boolean().optional(),
        includeTtsGender: z.boolean().optional(),
      })
      .optional(),
    includeTestDebug: z.boolean().optional(),
  })
  .strict();

export type TtsProxyRequest = z.infer<typeof ttsProxyRequestSchema>;

/** ~2 MB base64 payload limit (~1.5 MB raw audio) */
const MAX_STT_BASE64_CHARS = 2_800_000;

export const sttProxyRequestSchema = z
  .object({
    assistantId: assistantIdSchema,
    audio_base64: z
      .string()
      .min(1)
      .max(MAX_STT_BASE64_CHARS)
      .refine((v) => !v.includes('data:'), {
        message: 'audio_base64 must be raw base64 bytes, not a data URI',
      }),
    format: sttFormatSchema,
    language: sttLanguageSchema.optional(),
  })
  .strict();

export type SttProxyRequest = z.infer<typeof sttProxyRequestSchema>;

export const conversationsQuerySchema = z.object({
  assistantId: assistantIdSchema,
  external_user_id: trimmedString(200),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional(),
});

export const conversationMessagesQuerySchema = z.object({
  assistantId: assistantIdSchema,
});

export const loginProxyRequestSchema = z
  .object({
    assistantId: assistantIdSchema.optional().default('personaai-guide'),
    name: trimmedString(200),
    email: z.string().trim().email().max(320),
    visitor_id: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export type ConversationStatus = 'active' | 'completed' | string;

export interface NormalizedConversation {
  id: string;
  title: string;
  preview?: string;
  updatedAt: string;
  status: ConversationStatus;
  satisfaction_rating?: number | null;
}

export interface NormalizedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ConversationDetail {
  messages: NormalizedMessage[];
  status: ConversationStatus;
  satisfaction_rating?: number | null;
}

export interface ParsedChatPayload {
  responseText: string;
  responseType: ChatResponseType | null;
  conversationId?: string;
  clarificationOptions: ClarificationOption[];
  suggestions: ChatSuggestion[];
  sources?: unknown;
  usage?: unknown;
}

export const parseClarificationOptions = (data: unknown): ClarificationOption[] => {
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;
  const clarification =
    root.clarification && typeof root.clarification === 'object'
      ? (root.clarification as Record<string, unknown>)
      : root;
  const options = clarification.options;
  if (!Array.isArray(options)) return [];
  return options
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id || '').trim();
      const label = String(row.label || '').trim();
      if (!id || !label) return null;
      return { id, label };
    })
    .filter((row): row is ClarificationOption => !!row);
};

export const parseSuggestions = (data: unknown): ChatSuggestion[] => {
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;
  const list = root.suggestions;
  if (!Array.isArray(list)) return [];
  const out: ChatSuggestion[] = [];
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ message: item.trim(), label: item.trim() });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const message = String(row.message || row.text || row.label || '').trim();
    if (!message) continue;
    out.push({ message, label: String(row.label || message).trim() });
  }
  return out;
};

export const parseChatSuccessData = (data: unknown): ParsedChatPayload => {
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const payload =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const responseTypeRaw = String(payload.response_type || '').trim();
  const responseType = RESPONSE_TYPES.includes(responseTypeRaw as ChatResponseType)
    ? (responseTypeRaw as ChatResponseType)
    : null;

  return {
    responseText: String(
      payload.response || payload.message || payload.text || payload.content || ''
    ),
    responseType,
    conversationId:
      typeof payload.conversation_id === 'string' ? payload.conversation_id : undefined,
    clarificationOptions: parseClarificationOptions(payload),
    suggestions: parseSuggestions(payload),
    sources: payload.sources || payload.source,
    usage: payload.usage,
  };
};

export const isSafeHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const formatZodError = (error: z.ZodError): string =>
  error.issues.map((issue) => issue.message).join('; ');
