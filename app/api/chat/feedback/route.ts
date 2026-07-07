import { NextRequest, NextResponse } from 'next/server';
import { chatApiUrl, chatAuthHeaders } from '@/lib/chatApiServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, conversation_id, message_id, rating, comment } = body;

    if (!apiKey || !conversation_id || rating == null) {
      return NextResponse.json(
        { success: false, error: 'apiKey, conversation_id, and rating are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const payload: Record<string, string | number> = {
      conversation_id: String(conversation_id),
      rating: Number(rating),
    };
    if (message_id) payload.message_id = String(message_id);
    if (comment) payload.comment = String(comment).trim();

    const urls = [chatApiUrl('/v1/chat/feedback'), chatApiUrl('/chat/feedback')];

    for (const url of urls) {
      const response = await fetch(url, {
        method: 'POST',
        headers: chatAuthHeaders(apiKey),
        body: JSON.stringify(payload),
      });
      if (response.status !== 404) {
        const text = await response.text();
        try {
          return NextResponse.json(JSON.parse(text), { status: response.status });
        } catch {
          return NextResponse.json({ success: false, error: text }, { status: response.status });
        }
      }
    }

    return NextResponse.json({ success: true, data: { saved: true, localOnly: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    return NextResponse.json({ success: false, error: message, code: 'PROXY_ERROR' }, { status: 500 });
  }
}
