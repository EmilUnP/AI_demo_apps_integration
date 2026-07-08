import { NextRequest, NextResponse } from 'next/server';
import { chatApiUrl, chatAuthHeaders, parseJsonResponse, resolveAssistantShareLink } from '@/lib/chatApiServer';

/** Test endpoint — POST /api/v1/chat via proxy */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message = 'Hello, this is a test message',
      assistant,
      apiKey,
      language = 'az',
      external_user_id,
      external_user_name,
      external_user_email,
    } = body;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: apiKey is required',
        code: 'MISSING_FIELDS',
      }, { status: 400 });
    }

    const requestPayload: Record<string, unknown> = {
      message: String(message).trim(),
      language: String(language).trim(),
      external_user_id: external_user_id || `test-user-${Date.now()}`,
      new_conversation: true,
    };

    if (typeof external_user_name === 'string' && external_user_name.trim()) {
      requestPayload.external_user_name = external_user_name.trim();
    }
    if (typeof external_user_email === 'string' && external_user_email.trim()) {
      requestPayload.external_user_email = external_user_email.trim();
    }

    const shareLink = resolveAssistantShareLink(assistant);
    if (shareLink) requestPayload.assistant = shareLink;

    const apiUrl = chatApiUrl('/v1/chat');

    console.log('[Test] POST', apiUrl, { assistant: shareLink || '(API key)' });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: chatAuthHeaders(apiKey),
      body: JSON.stringify(requestPayload),
    });

    const parsedResponse = await parseJsonResponse(response);

    return NextResponse.json({
      success: response.ok,
      testResults: {
        endpoint: apiUrl,
        requestPayload,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: parsedResponse,
        },
        apiKey: {
          format: apiKey.startsWith('sk_') ? 'VALID' : 'INVALID',
          length: apiKey.length,
          preview: `${apiKey.substring(0, 12)}...`,
        },
      },
      diagnostics: {
        apiError: !response.ok,
        errorDetails: response.ok ? null : parsedResponse,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Test failed';
    console.error('[Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: message,
      code: 'TEST_ERROR',
    }, { status: 500 });
  }
}
