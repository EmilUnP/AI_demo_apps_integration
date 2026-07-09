import { NextRequest, NextResponse } from 'next/server';
import { chatApiUrl, parseJsonResponse, resolveAssistantShareLink } from '@/lib/chatApiServer';
import { AssistantsApiTestOptions } from '@/lib/assistantsApiTestOptions';
import {
  ApiTestDebugInfo,
  headersForTestLog,
  sanitizeBrowserProxyBody,
} from '@/lib/assistantsApiTestLog';

const previewResponse = (payload: unknown, max = 800): string => {
  try {
    const text = JSON.stringify(payload, null, 2);
    return text.length > max ? `${text.slice(0, max)}…` : text;
  } catch {
    return String(payload);
  }
};

/** Proxy POST /api/v1/tts — returns raw audio/mpeg on success. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, apiKey, language, assistant, apiTestOptions, includeTestDebug } = body as {
      text?: string;
      apiKey?: string;
      language?: string;
      assistant?: string;
      apiTestOptions?: AssistantsApiTestOptions;
      includeTestDebug?: boolean;
    };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'text is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json(
        { success: false, error: 'apiKey is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    const requestPayload: Record<string, unknown> = {
      text: text.trim(),
    };

    if (apiTestOptions?.includeTtsGender !== false) {
      requestPayload.gender = 'female';
    }

    if (typeof language === 'string' && language.trim()) {
      requestPayload.language = language.trim();
    }

    const shareLink = resolveAssistantShareLink(assistant);
    if (shareLink) requestPayload.assistant = shareLink;

    const endpoints = [chatApiUrl('/v1/tts'), chatApiUrl('/tts')];
    const upstreamHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
      Accept: 'audio/mpeg, application/json',
    };

    let response: Response | null = null;
    let usedEndpoint = endpoints[0];

    for (const apiUrl of endpoints) {
      try {
        usedEndpoint = apiUrl;
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: upstreamHeaders,
          body: JSON.stringify(requestPayload),
        });
        if (response.status !== 404) break;
      } catch (error: unknown) {
        const details = error instanceof Error ? error.message : 'Network error';
        return NextResponse.json(
          { success: false, error: 'Failed to connect to TTS API', details, code: 'NETWORK_ERROR' },
          { status: 503 }
        );
      }
    }

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'No response from TTS API', code: 'NO_RESPONSE' },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const errorBody = await parseJsonResponse(response);
      const errorPayload =
        typeof errorBody === 'object' && errorBody
          ? errorBody
          : { success: false, error: 'TTS failed', code: 'TTS_ERROR' };

      if (includeTestDebug) {
        const debug: ApiTestDebugInfo = {
          at: new Date().toISOString(),
          kind: 'tts',
          upstream: {
            url: usedEndpoint,
            method: 'POST',
            headers: headersForTestLog(upstreamHeaders),
            body: requestPayload,
          },
          browserToProxy: {
            url: '/api/chat/tts',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: sanitizeBrowserProxyBody(body as Record<string, unknown>),
          },
          response: {
            status: response.status,
            contentType: response.headers.get('content-type') || 'application/json',
            preview: previewResponse(errorPayload),
          },
        };
        return NextResponse.json({ ...(errorPayload as Record<string, unknown>), _testDebug: debug }, {
          status: response.status,
        });
      }

      return NextResponse.json(errorPayload, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'audio/mpeg';

    if (includeTestDebug) {
      const debug: ApiTestDebugInfo = {
        at: new Date().toISOString(),
        kind: 'tts',
        upstream: {
          url: usedEndpoint,
          method: 'POST',
          headers: headersForTestLog(upstreamHeaders),
          body: requestPayload,
        },
        browserToProxy: {
          url: '/api/chat/tts',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: sanitizeBrowserProxyBody(body as Record<string, unknown>),
        },
        response: {
          status: response.status,
          contentType,
          preview: `<binary MP3 · ${audioBuffer.byteLength} bytes>`,
        },
      };

      return NextResponse.json({
        success: true,
        audioContentType: contentType,
        audioBase64: Buffer.from(audioBuffer).toString('base64'),
        _testDebug: debug,
      });
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition':
          response.headers.get('Content-Disposition') || 'inline; filename="assistant-reply.mp3"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TTS Proxy] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details, code: 'PROXY_ERROR' },
      { status: 500 }
    );
  }
}
