import { NextRequest, NextResponse } from 'next/server';
import {
  missingAssistantKeyResponse,
  normalizeConversations,
  resolveAssistantApiKey,
  safeErrorMessage,
  upstreamJson,
  validationErrorResponse,
} from '@/lib/chatApiServer';
import { conversationsQuerySchema } from '@/lib/chatTypes';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = conversationsQuerySchema.safeParse({
      assistantId: searchParams.get('assistantId'),
      external_user_id:
        searchParams.get('external_user_id') || searchParams.get('visitor_id'),
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
    }

    const { assistantId, external_user_id, limit, offset } = parsed.data;
    const apiKey = resolveAssistantApiKey(assistantId, 'chat');
    if (!apiKey) {
      return NextResponse.json(missingAssistantKeyResponse(assistantId, 'chat'), { status: 503 });
    }

    const v1Query = new URLSearchParams({
      action: 'conversations',
      external_user_id,
      limit: String(limit),
    });
    if (typeof offset === 'number') v1Query.set('offset', String(offset));

    const { response, data } = await upstreamJson(`/v1/data?${v1Query}`, apiKey);

    const payload = data as { success?: boolean; data?: unknown; error?: string };
    if (payload.success === false) {
      return NextResponse.json(payload, { status: response.status });
    }

    const list = normalizeConversations(payload.data ?? payload);
    return NextResponse.json({ success: true, data: list }, { status: response.status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: safeErrorMessage(error, 'Failed to load conversations'),
        code: 'PROXY_ERROR',
      },
      { status: 500 }
    );
  }
}
