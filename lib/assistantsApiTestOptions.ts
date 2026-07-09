/** Toggle optional fields in /assistants API bodies — off = omit from request (old API style). */
export interface AssistantsApiTestOptions {
  includeChatLanguage: boolean;
  includeExternalUserId: boolean;
  includeExternalUserName: boolean;
  includeExternalUserEmail: boolean;
  includeConversationMemory: boolean;
  includeTtsLanguage: boolean;
  includeTtsGender: boolean;
}

export const ASSISTANTS_API_TEST_OPTIONS_KEY = 'assistants_api_test_options';

export const DEFAULT_ASSISTANTS_API_TEST_OPTIONS: AssistantsApiTestOptions = {
  includeChatLanguage: true,
  includeExternalUserId: true,
  includeExternalUserName: true,
  includeExternalUserEmail: true,
  includeConversationMemory: true,
  includeTtsLanguage: true,
  includeTtsGender: true,
};

/** Typical older client — core fields only; new optional params omitted. Should not break. */
export const LEGACY_ASSISTANTS_API_TEST_OPTIONS: AssistantsApiTestOptions = {
  includeChatLanguage: true,
  includeExternalUserId: true,
  includeExternalUserName: false,
  includeExternalUserEmail: false,
  includeConversationMemory: true,
  includeTtsLanguage: false,
  includeTtsGender: false,
};

export const loadAssistantsApiTestOptions = (): AssistantsApiTestOptions => {
  if (typeof window === 'undefined') return { ...DEFAULT_ASSISTANTS_API_TEST_OPTIONS };
  try {
    const raw = sessionStorage.getItem(ASSISTANTS_API_TEST_OPTIONS_KEY);
    if (!raw) return { ...DEFAULT_ASSISTANTS_API_TEST_OPTIONS };
    const parsed = JSON.parse(raw) as Partial<AssistantsApiTestOptions>;
    return { ...DEFAULT_ASSISTANTS_API_TEST_OPTIONS, ...parsed };
  } catch {
    return { ...DEFAULT_ASSISTANTS_API_TEST_OPTIONS };
  }
};

export const saveAssistantsApiTestOptions = (options: AssistantsApiTestOptions): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ASSISTANTS_API_TEST_OPTIONS_KEY, JSON.stringify(options));
};

export const describeChatBodyFields = (
  options: AssistantsApiTestOptions,
  user?: { visitorId: string; name: string; email: string } | null
): string[] => {
  const fields = ['message'];
  if (options.includeChatLanguage) fields.push('language');
  if (options.includeExternalUserId && user?.visitorId) fields.push('external_user_id');
  if (options.includeExternalUserName && user?.name) fields.push('external_user_name');
  if (options.includeExternalUserEmail && user?.email) fields.push('external_user_email');
  if (options.includeConversationMemory) fields.push('conversation_id | new_conversation');
  return fields;
};

export const describeTtsBodyFields = (options: AssistantsApiTestOptions): string[] => {
  const fields = ['text'];
  if (options.includeTtsLanguage) fields.push('language');
  if (options.includeTtsGender) fields.push('gender');
  return fields;
};
