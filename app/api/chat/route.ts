import { NextRequest, NextResponse } from 'next/server';
import {
  chatApiUrl,
  chatAuthHeaders,
  parseJsonResponse,
  resolveAssistantShareLink,
} from '@/lib/chatApiServer';

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
    } = body;

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

    const lang = typeof language === 'string' && language.trim() ? language.trim() : 'az';
    requestPayload.language = lang;

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

    console.log('[API Proxy] POST chat', {
      endpoints: endpoints[0],
      hasExternalUserId: !!externalUserId,
      conversationId: requestPayload.conversation_id || '(new)',
      newConversation: !!requestPayload.new_conversation,
      assistant: shareLink || '(resolved from API key)',
      language: lang,
    });

    let response: Response | null = null;
    let apiResponse: unknown = null;

    for (const apiUrl of endpoints) {
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: chatAuthHeaders(apiKey),
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

    return NextResponse.json(apiResponse, {
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
