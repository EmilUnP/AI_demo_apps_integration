import { NextRequest, NextResponse } from 'next/server';
import {
  chatApiUrl,
  chatAuthHeaders,
  parseJsonResponse,
  resolveAssistantShareLink,
} from '@/lib/chatApiServer';
import { AssistantsApiTestOptions } from '@/lib/assistantsApiTestOptions';
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
    const {
      message,
      assistant,
      external_user_id,
      external_user_name,
      external_user_email,
      visitor_id,
      apiKey,
      language,
      conversation_id,
      new_conversation,
      temperature,
      max_tokens,
      stream,
      apiTestOptions,
      includeTestDebug,
    } = body as {
      message?: string;
      assistant?: string;
      external_user_id?: string;
      external_user_name?: string;
      external_user_email?: string;
      visitor_id?: string;
      apiKey?: string;
      language?: string;
      conversation_id?: string;
      new_conversation?: boolean;
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
      apiTestOptions?: AssistantsApiTestOptions;
      includeTestDebug?: boolean;
    };

    if (!message || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          code: 'MISSING_PARAMS',
          details: 'message and apiKey are required',
        },
        { status: 400 }
      );
    }

    const requestPayload: Record<string, unknown> = {
      message: String(message).trim(),
    };

    const includeLanguage = apiTestOptions?.includeChatLanguage !== false;
    if (includeLanguage) {
      const lang = typeof language === 'string' && language.trim() ? language.trim() : 'az';
      requestPayload.language = lang;
    } else if (typeof language === 'string' && language.trim()) {
      requestPayload.language = language.trim();
    }

    const externalUserId =
      (typeof external_user_id === 'string' && external_user_id.trim()) ||
      (typeof visitor_id === 'string' && visitor_id.trim()) ||
      undefined;
    if (externalUserId) requestPayload.external_user_id = externalUserId;

    if (typeof external_user_name === 'string' && external_user_name.trim()) {
      requestPayload.external_user_name = external_user_name.trim();
    }
    if (typeof external_user_email === 'string' && external_user_email.trim()) {
      requestPayload.external_user_email = external_user_email.trim();
    }

    if (typeof conversation_id === 'string' && conversation_id.trim()) {
      requestPayload.conversation_id = conversation_id.trim();
    }
    if (new_conversation === true) {
      requestPayload.new_conversation = true;
    }
    if (typeof temperature === 'number' && Number.isFinite(temperature)) {
      requestPayload.temperature = temperature;
    }
    if (typeof max_tokens === 'number' && Number.isFinite(max_tokens)) {
      requestPayload.max_tokens = max_tokens;
    }
    if (stream === true) {
      requestPayload.stream = true;
    }

    const shareLink = resolveAssistantShareLink(assistant);
    if (shareLink) requestPayload.assistant = shareLink;

    const endpoints = [chatApiUrl('/v1/chat'), chatApiUrl('/chat')];
    const upstreamHeaders = chatAuthHeaders(apiKey);

    console.log('[API Proxy] POST chat', {
      endpoints: endpoints[0],
      hasExternalUserId: !!externalUserId,
      conversationId: requestPayload.conversation_id || '(new)',
      newConversation: !!requestPayload.new_conversation,
      assistant: shareLink || '(resolved from API key)',
      language: requestPayload.language || '(omitted)',
      bodyFields: Object.keys(requestPayload),
    });

    let response: Response | null = null;
    let apiResponse: unknown = null;
    let usedEndpoint = endpoints[0];

    for (const apiUrl of endpoints) {
      try {
        usedEndpoint = apiUrl;
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: upstreamHeaders,
          body: JSON.stringify(requestPayload),
        });
        apiResponse = await parseJsonResponse(response);
        if (response.status !== 404) break;
      } catch (error: unknown) {
        const details = error instanceof Error ? error.message : 'Network error';
        return NextResponse.json(
          { success: false, error: 'Failed to connect to chat API', details, code: 'NETWORK_ERROR' },
          { status: 503 }
        );
      }
    }

    if (!response || !apiResponse) {
      return NextResponse.json(
        { success: false, error: 'No response from chat API', code: 'NO_RESPONSE' },
        { status: 503 }
      );
    }

    const responsePayload = includeTestDebug
      ? attachTestDebug(apiResponse, {
          at: new Date().toISOString(),
          kind: 'chat',
          upstream: {
            url: usedEndpoint,
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
            contentType: response.headers.get('content-type') || 'application/json',
            preview: previewResponse(apiResponse),
          },
        })
      : apiResponse;

    return NextResponse.json(responsePayload, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Proxy] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details, code: 'PROXY_ERROR' },
      { status: 500 }
    );
  }
}
