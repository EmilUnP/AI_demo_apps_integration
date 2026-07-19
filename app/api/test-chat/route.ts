import { NextRequest, NextResponse } from 'next/server';
import {
  isDevDiagnosticsEnabled,
  missingAssistantKeyResponse,
  resolveAssistantApiKey,
  resolveAssistantShareLink,
  safeErrorMessage,
  upstreamJson,
  validationErrorResponse,
} from '@/lib/chatApiServer';
import { assistantIdSchema } from '@/lib/chatTypes';
import { z } from 'zod';

const testChatSchema = z.object({
  message: z.string().trim().min(1).max(8000).optional().default('Hello, this is a test message'),
  assistantId: assistantIdSchema.optional().default('personaai-guide'),
  assistant: z.string().trim().min(1).max(200).optional(),
  language: z.enum(['auto', 'az', 'en', 'ru']).optional().default('auto'),
  external_user_id: z.string().trim().min(1).max(200).optional(),
  external_user_name: z.string().trim().min(1).max(200).optional(),
  external_user_email: z.string().trim().email().max(320).optional(),
});

/** Dev-only test endpoint — never accepts client API keys. */
export async function POST(request: NextRequest) {
  if (!isDevDiagnosticsEnabled()) {
    return NextResponse.json(
      { success: false, error: 'Diagnostics disabled', code: 'DIAGNOSTICS_DISABLED' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = testChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
    }

    const {
      message,
      assistantId,
      assistant,
      language,
      external_user_id,
      external_user_name,
      external_user_email,
    } = parsed.data;

    const apiKey = resolveAssistantApiKey(assistantId, 'chat');
    if (!apiKey) {
      return NextResponse.json(missingAssistantKeyResponse(assistantId, 'chat'), { status: 503 });
    }

    const requestPayload: Record<string, unknown> = {
      message,
      language,
      external_user_id: external_user_id || `test-user-${Date.now()}`,
      new_conversation: true,
      stream: false,
    };

    if (external_user_name) requestPayload.external_user_name = external_user_name;
    if (external_user_email) requestPayload.external_user_email = external_user_email;

    const shareLink = resolveAssistantShareLink(assistant);
    if (shareLink) requestPayload.assistant = shareLink;

    const { response, data } = await upstreamJson('/v1/chat', apiKey, {
      method: 'POST',
      body: JSON.stringify(requestPayload),
    });

    return NextResponse.json(
      {
        success: response.ok,
        testResults: {
          endpoint: '/v1/chat',
          assistantId,
          requestPayload: {
            ...requestPayload,
            // never echo secrets
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            body: data,
          },
          apiKeyConfigured: true,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[Test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: safeErrorMessage(error, 'Test failed'),
        code: 'TEST_ERROR',
      },
      { status: 500 }
    );
  }
}
