import { NextRequest, NextResponse } from 'next/server';
import { chatApiUrl, chatAuthHeaders, parseJsonResponse } from '@/lib/chatApiServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      apiKey,
      conversation_id,
      rating,
      feedback_text,
      comment,
      helpful,
      skip_rating,
    } = body;

    if (!apiKey || !conversation_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'apiKey and conversation_id are required',
          code: 'MISSING_FIELDS',
        },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      conversation_id: String(conversation_id),
    };

    if (skip_rating === true) {
      payload.skip_rating = true;
    } else if (rating != null) {
      payload.rating = Number(rating);
      if (typeof helpful === 'boolean') payload.helpful = helpful;
      else payload.helpful = Number(rating) >= 3;
    }

    const text =
      (typeof feedback_text === 'string' && feedback_text.trim()) ||
      (typeof comment === 'string' && comment.trim()) ||
      '';
    if (text) payload.feedback_text = text;

    const response = await fetch(chatApiUrl('/v1/feedback'), {
      method: 'POST',
      headers: chatAuthHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const parsed = await parseJsonResponse(response);
    return NextResponse.json(parsed, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    return NextResponse.json({ success: false, error: message, code: 'PROXY_ERROR' }, { status: 500 });
  }
}
