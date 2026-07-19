import { NextRequest, NextResponse } from 'next/server';
import {
  missingAssistantKeyResponse,
  resolveAssistantApiKey,
  safeErrorMessage,
  upstreamJson,
  validationErrorResponse,
} from '@/lib/chatApiServer';
import { sttProxyRequestSchema } from '@/lib/chatTypes';

/** Proxy POST /api/v1/stt — Whisper transcription. Returns JSON { success, data: { text } }. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sttProxyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
    }

    const { assistantId, audio_base64, format, language } = parsed.data;
    const apiKey = resolveAssistantApiKey(assistantId, 'chat');
    if (!apiKey) {
      return NextResponse.json(missingAssistantKeyResponse(assistantId, 'chat'), { status: 503 });
    }

    const payload: Record<string, unknown> = {
      audio_base64,
      format,
    };
    if (language) payload.language = language;

    const { response, data } = await upstreamJson('/v1/stt', apiKey, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('[STT Proxy] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: safeErrorMessage(error, 'STT failed'),
        code: 'PROXY_ERROR',
      },
      { status: 500 }
    );
  }
}
