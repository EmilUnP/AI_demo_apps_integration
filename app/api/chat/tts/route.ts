import { NextRequest, NextResponse } from 'next/server';
import { chatApiUrl, parseJsonResponse, resolveAssistantShareLink } from '@/lib/chatApiServer';

/** Proxy POST /api/v1/tts — returns raw audio/mpeg on success. Gender fixed to female for this demo. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, apiKey, language, assistant } = body;

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
      gender: 'female',
    };

    if (typeof language === 'string' && language.trim()) {
      requestPayload.language = language.trim();
    }

    const shareLink = resolveAssistantShareLink(assistant);
    if (shareLink) requestPayload.assistant = shareLink;

    const endpoints = [chatApiUrl('/v1/tts'), chatApiUrl('/tts')];

    let response: Response | null = null;

    for (const apiUrl of endpoints) {
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
            Accept: 'audio/mpeg, application/json',
          },
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
      return NextResponse.json(
        typeof errorBody === 'object' && errorBody
          ? errorBody
          : { success: false, error: 'TTS failed', code: 'TTS_ERROR' },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
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
