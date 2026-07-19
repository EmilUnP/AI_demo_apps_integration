import { NextRequest, NextResponse } from 'next/server';
import {
  extractConversationDetail,
  missingAssistantKeyResponse,
  resolveAssistantApiKey,
  safeErrorMessage,
  upstreamJson,
  validationErrorResponse,
} from '@/lib/chatApiServer';
import { conversationMessagesQuerySchema } from '@/lib/chatTypes';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parsed = conversationMessagesQuerySchema.safeParse({
      assistantId: request.nextUrl.searchParams.get('assistantId'),
    });
    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
    }

    const { assistantId } = parsed.data;
    const apiKey = resolveAssistantApiKey(assistantId, 'chat');
    if (!apiKey) {
      return NextResponse.json(missingAssistantKeyResponse(assistantId, 'chat'), { status: 503 });
    }

    const conversationId = params.id;
    if (!conversationId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'conversation id is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    const v1Query = new URLSearchParams({
      action: 'conversations',
      id: conversationId,
    });

    const { response, data } = await upstreamJson(`/v1/data?${v1Query}`, apiKey);
    const payload = data as { success?: boolean; data?: unknown; error?: string; code?: string };

    if (payload.success === false) {
      return NextResponse.json(payload, { status: response.status });
    }

    const detail = extractConversationDetail(payload.data ?? payload);

    return NextResponse.json(
      {
        success: true,
        data: {
          messages: detail.messages,
          status: detail.status || 'active',
          satisfaction_rating: detail.satisfaction_rating ?? null,
        },
      },
      { status: response.ok ? 200 : response.status }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: safeErrorMessage(error, 'Failed to load messages'),
        code: 'PROXY_ERROR',
      },
      { status: 500 }
    );
  }
}
