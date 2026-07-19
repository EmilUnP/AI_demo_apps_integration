import { NextRequest, NextResponse } from 'next/server';
import {
  chatApiUrl,
  chatAuthHeaders,
  fetchWithTimeout,
  isDevDiagnosticsEnabled,
  missingAssistantKeyResponse,
  parseJsonResponse,
  resolveAssistantApiKey,
  resolveAssistantShareLink,
  safeErrorMessage,
  validationErrorResponse,
} from '@/lib/chatApiServer';
import { chatProxyRequestSchema } from '@/lib/chatTypes';
import {
  ApiTestDebugInfo,
  headersForTestLog,
  sanitizeBrowserProxyBody,
} from '@/lib/assistantsApiTestLog';

const previewResponse = (payload: unknown, max = 1200): string => {
  try {
    const text = JSON.stringify(payload, null, 2);
    return text.length > max ? `${text.slice(0, max)}…` : text;
  } catch {
    return String(payload);
  }
};

const attachTestDebug = (payload: unknown, debug: ApiTestDebugInfo): unknown => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { data: payload, _testDebug: debug };
  }
  return { ...(payload as Record<string, unknown>), _testDebug: debug };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = chatProxyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
    }

    const {
      message,
      assistantId,
      assistantMode,
      language,
      external_user_id,
      external_user_name,
      external_user_email,
      conversation_id,
      new_conversation,
      temperature,
      max_tokens,
      stream,
      option_id,
      clarification_option_id,
      assistant,
      apiTestOptions,
      includeTestDebug,
    } = parsed.data;

    const mode = assistantMode === 'task' ? 'task' : 'chat';
    const apiKey = resolveAssistantApiKey(assistantId, mode);
    if (!apiKey) {
      return NextResponse.json(missingAssistantKeyResponse(assistantId, mode), { status: 503 });
    }

    // Test debug needs a single JSON body — force non-stream
    const useStream = stream === true && !(includeTestDebug && isDevDiagnosticsEnabled());

    const requestPayload: Record<string, unknown> = {
      message,
      stream: useStream,
    };

    const includeLanguage = apiTestOptions?.includeChatLanguage !== false;
    if (includeLanguage) {
      requestPayload.language = language || 'auto';
    } else if (language) {
      requestPayload.language = language;
    }

    const includeExternalUserId =
      mode === 'task' || apiTestOptions?.includeExternalUserId !== false;
    if (includeExternalUserId && external_user_id) {
      requestPayload.external_user_id = external_user_id;
    }
    if (apiTestOptions?.includeExternalUserName !== false && external_user_name) {
      requestPayload.external_user_name = external_user_name;
    }
    if (apiTestOptions?.includeExternalUserEmail !== false && external_user_email) {
      requestPayload.external_user_email = external_user_email;
    }

    const includeConversationMemory =
      mode !== 'task' && apiTestOptions?.includeConversationMemory !== false;
    if (includeConversationMemory) {
      if (conversation_id) requestPayload.conversation_id = conversation_id;
      if (new_conversation === true) requestPayload.new_conversation = true;
    }

    if (typeof temperature === 'number') requestPayload.temperature = temperature;
    if (typeof max_tokens === 'number') requestPayload.max_tokens = max_tokens;

    const resolvedOptionId = option_id || clarification_option_id;
    if (resolvedOptionId) {
      requestPayload.option_id = resolvedOptionId;
    }

    const shareLink = resolveAssistantShareLink(assistant);
    if (shareLink) requestPayload.assistant = shareLink;

    const apiUrl = chatApiUrl('/v1/chat');
    const upstreamHeaders = {
      ...chatAuthHeaders(apiKey),
      ...(useStream ? { Accept: 'text/event-stream, application/json' } : {}),
    };

    console.log('[API Proxy] POST /v1/chat', {
      assistantId,
      mode,
      stream: useStream,
      hasExternalUserId: !!requestPayload.external_user_id,
      conversationId: requestPayload.conversation_id || '(new)',
      newConversation: !!requestPayload.new_conversation,
      optionId: requestPayload.option_id || '(none)',
      language: requestPayload.language || '(omitted)',
      bodyFields: Object.keys(requestPayload),
    });

    let response: Response;
    try {
      response = await fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: upstreamHeaders,
        body: JSON.stringify(requestPayload),
      });
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: safeErrorMessage(error, 'Failed to connect to chat API'),
          code: 'NETWORK_ERROR',
        },
        { status: 503 }
      );
    }

    const contentType = response.headers.get('content-type') || '';

    // Forward SSE stream unchanged
    if (useStream && contentType.includes('text/event-stream') && response.body) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const apiResponse = await parseJsonResponse(response);
    const allowDebug = includeTestDebug === true && isDevDiagnosticsEnabled();

    const responsePayload = allowDebug
      ? attachTestDebug(apiResponse, {
          at: new Date().toISOString(),
          kind: 'chat',
          mode,
          keyType: mode,
          upstream: {
            url: apiUrl,
            method: 'POST',
            headers: headersForTestLog(upstreamHeaders),
            body: requestPayload,
          },
          browserToProxy: {
            url: '/api/chat',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: sanitizeBrowserProxyBody(body as Record<string, unknown>),
          },
          response: {
            status: response.status,
            contentType: contentType || 'application/json',
            preview: previewResponse(apiResponse),
          },
        })
      : apiResponse;

    return NextResponse.json(responsePayload, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[API Proxy] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: safeErrorMessage(error, 'Internal server error'),
        code: 'PROXY_ERROR',
      },
      { status: 500 }
    );
  }
}
