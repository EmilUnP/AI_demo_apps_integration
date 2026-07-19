import { NextRequest, NextResponse } from 'next/server';
import {
  chatApiUrl,
  fetchWithTimeout,
  isDevDiagnosticsEnabled,
  missingAssistantKeyResponse,
  parseJsonResponse,
  resolveAssistantApiKey,
  resolveAssistantShareLink,
  safeErrorMessage,
  validationErrorResponse,
} from '@/lib/chatApiServer';
import { ttsProxyRequestSchema } from '@/lib/chatTypes';
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

/** Proxy POST /api/v1/tts — returns raw audio/wav on success. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ttsProxyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
    }

    const {
      text,
      assistantId,
      language,
      gender,
      assistant,
      apiTestOptions,
      includeTestDebug,
    } = parsed.data;

    const apiKey = resolveAssistantApiKey(assistantId, 'chat');
    if (!apiKey) {
      return NextResponse.json(missingAssistantKeyResponse(assistantId, 'chat'), { status: 503 });
    }

    const requestPayload: Record<string, unknown> = { text };

    if (apiTestOptions?.includeTtsLanguage !== false) {
      requestPayload.language = language || 'auto';
    } else if (language) {
      requestPayload.language = language;
    }

    if (apiTestOptions?.includeTtsGender !== false && gender) {
      requestPayload.gender = gender;
    }

    const shareLink = resolveAssistantShareLink(assistant);
    if (shareLink) requestPayload.assistant = shareLink;

    const apiUrl = chatApiUrl('/v1/tts');
    const upstreamHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      Accept: 'audio/wav, audio/mpeg, application/json',
    };

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
          error: safeErrorMessage(error, 'Failed to connect to TTS API'),
          code: 'NETWORK_ERROR',
        },
        { status: 503 }
      );
    }

    const allowDebug = includeTestDebug === true && isDevDiagnosticsEnabled();

    if (!response.ok) {
      const errorBody = await parseJsonResponse(response);
      const errorPayload =
        typeof errorBody === 'object' && errorBody
          ? errorBody
          : { success: false, error: 'TTS failed', code: 'TTS_ERROR' };

      if (allowDebug) {
        const debug: ApiTestDebugInfo = {
          at: new Date().toISOString(),
          kind: 'tts',
          upstream: {
            url: apiUrl,
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
        return NextResponse.json(
          { ...(errorPayload as Record<string, unknown>), _testDebug: debug },
          { status: response.status }
        );
      }

      return NextResponse.json(errorPayload, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'audio/wav';
    const isWav = contentType.includes('wav');
    const filename = isWav ? 'assistant-reply.wav' : 'assistant-reply.mp3';

    if (allowDebug) {
      const debug: ApiTestDebugInfo = {
        at: new Date().toISOString(),
        kind: 'tts',
        upstream: {
          url: apiUrl,
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
          preview: `<binary audio · ${audioBuffer.byteLength} bytes>`,
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
          response.headers.get('Content-Disposition') || `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('[TTS Proxy] Unexpected error:', error);
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
