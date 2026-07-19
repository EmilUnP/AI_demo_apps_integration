/**
 * Contract tests for PersonaAI v2.7+ proxy validation / normalization.
 * Run: npx tsx lib/chatContract.test.ts
 */
import assert from 'node:assert/strict';
import {
  chatProxyRequestSchema,
  feedbackProxyRequestSchema,
  ttsProxyRequestSchema,
  sttProxyRequestSchema,
  isSafeHttpUrl,
  parseChatSuccessData,
  parseClarificationOptions,
  parseSuggestions,
} from './chatTypes';
import {
  extractConversationDetail,
  normalizeConversations,
  normalizeMessages,
} from './chatApiServer';

let passed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
};

check('rejects client apiKey in chat body (strict)', () => {
  const result = chatProxyRequestSchema.safeParse({
    message: 'Hello',
    assistantId: 'personaai-guide',
    apiKey: 'sk_should_be_rejected',
  });
  assert.equal(result.success, false);
});

check('accepts valid chat payload with new_conversation', () => {
  const result = chatProxyRequestSchema.safeParse({
    message: 'Hello',
    assistantId: 'personaai-guide',
    external_user_id: 'user-1',
    new_conversation: true,
    language: 'auto',
    stream: false,
  });
  assert.equal(result.success, true);
});

check('accepts resume payload without conversation_id or new_conversation', () => {
  const result = chatProxyRequestSchema.safeParse({
    message: 'Follow up',
    assistantId: 'personaai-guide',
    external_user_id: 'user-1',
    language: 'auto',
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.conversation_id, undefined);
    assert.equal(result.data.new_conversation, undefined);
  }
});

check('accepts option_id for Adaptive RAG clarification', () => {
  const result = chatProxyRequestSchema.safeParse({
    message: 'Billing scope',
    assistantId: 'personaai-guide',
    conversation_id: 'conv-1',
    option_id: 'scope_ab12cd34ef56',
  });
  assert.equal(result.success, true);
});

check('accepts clarification_option_id alias', () => {
  const result = chatProxyRequestSchema.safeParse({
    message: 'Billing scope',
    assistantId: 'personaai-guide',
    conversation_id: 'conv-1',
    clarification_option_id: 'scope_ab12cd34ef56',
  });
  assert.equal(result.success, true);
});

check('temperature max is 1 (not 2)', () => {
  const ok = chatProxyRequestSchema.safeParse({
    message: 'Hi',
    assistantId: 'personaai-guide',
    temperature: 0.7,
  });
  assert.equal(ok.success, true);

  const tooHigh = chatProxyRequestSchema.safeParse({
    message: 'Hi',
    assistantId: 'personaai-guide',
    temperature: 1.5,
  });
  assert.equal(tooHigh.success, false);
});

check('allows stream:true (SSE proxy)', () => {
  const result = chatProxyRequestSchema.safeParse({
    message: 'Hello',
    assistantId: 'personaai-guide',
    stream: true,
  });
  assert.equal(result.success, true);
});

check('feedback requires rating unless skip_rating', () => {
  const missing = feedbackProxyRequestSchema.safeParse({
    assistantId: 'personaai-guide',
    conversation_id: 'c1',
  });
  assert.equal(missing.success, false);

  const skip = feedbackProxyRequestSchema.safeParse({
    assistantId: 'personaai-guide',
    conversation_id: 'c1',
    skip_rating: true,
  });
  assert.equal(skip.success, true);

  const rated = feedbackProxyRequestSchema.safeParse({
    assistantId: 'personaai-guide',
    conversation_id: 'c1',
    rating: 5,
    helpful: true,
  });
  assert.equal(rated.success, true);

  const alias = feedbackProxyRequestSchema.safeParse({
    assistantId: 'personaai-guide',
    conversation_id: 'c1',
    satisfaction_rating: 4,
  });
  assert.equal(alias.success, true);
});

check('tts validates text and gender', () => {
  const ok = ttsProxyRequestSchema.safeParse({
    text: 'Hello there',
    assistantId: 'personaai-guide',
    language: 'auto',
    gender: 'female',
  });
  assert.equal(ok.success, true);

  const badGender = ttsProxyRequestSchema.safeParse({
    text: 'Hello',
    assistantId: 'personaai-guide',
    gender: 'robot',
  });
  assert.equal(badGender.success, false);
});

check('stt validates base64 audio (not data URI)', () => {
  const ok = sttProxyRequestSchema.safeParse({
    assistantId: 'personaai-guide',
    audio_base64: 'UklGRiQA',
    format: 'webm',
    language: 'az',
  });
  assert.equal(ok.success, true);

  const dataUri = sttProxyRequestSchema.safeParse({
    assistantId: 'personaai-guide',
    audio_base64: 'data:audio/webm;base64,AAA',
    format: 'webm',
  });
  assert.equal(dataUri.success, false);
});

check('parses clarification options and suggestions', () => {
  const options = parseClarificationOptions({
    clarification: {
      options: [
        { id: 'scope_1', label: 'Billing' },
        { id: 'scope_2', label: 'Support' },
      ],
    },
  });
  assert.equal(options.length, 2);
  assert.equal(options[0].id, 'scope_1');

  const suggestions = parseSuggestions({
    suggestions: [{ message: 'How do I reset?', label: 'Reset password' }, 'What are your hours?'],
  });
  assert.equal(suggestions.length, 2);
  assert.equal(suggestions[0].message, 'How do I reset?');
});

check('parseChatSuccessData reads response_type', () => {
  const parsed = parseChatSuccessData({
    success: true,
    data: {
      response: 'Which area?',
      response_type: 'clarification',
      conversation_id: 'c-99',
      clarification: {
        options: [{ id: 'a', label: 'A' }],
      },
    },
  });
  assert.equal(parsed.responseType, 'clarification');
  assert.equal(parsed.conversationId, 'c-99');
  assert.equal(parsed.clarificationOptions.length, 1);
});

check('normalizes conversations and completed status', () => {
  const list = normalizeConversations({
    conversations: [
      {
        id: 'abc',
        title: 'Hi',
        status: 'completed',
        satisfaction_rating: 5,
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  });
  assert.equal(list.length, 1);
  assert.equal(list[0].status, 'completed');
  assert.equal(list[0].satisfaction_rating, 5);
});

check('extracts conversation detail with messages + status', () => {
  const detail = extractConversationDetail({
    status: 'completed',
    satisfaction_rating: 4,
    messages: [
      { id: '1', role: 'user', content: 'Hi', created_at: '2026-01-01T00:00:00.000Z' },
      { role: 'assistant', message: 'Hello', timestamp: '2026-01-01T00:00:01.000Z' },
    ],
  });
  assert.equal(detail.status, 'completed');
  assert.equal(detail.satisfaction_rating, 4);
  assert.equal(detail.messages.length, 2);
  assert.equal(detail.messages[1].role, 'assistant');
  assert.equal(detail.messages[1].content, 'Hello');
});

check('normalizeMessages handles empty payload', () => {
  assert.deepEqual(normalizeMessages(null), []);
});

check('isSafeHttpUrl blocks javascript: URLs', () => {
  assert.equal(isSafeHttpUrl('https://example.com'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
});

console.log(`\n${passed} contract checks passed`);
