import { NextRequest, NextResponse } from 'next/server';
import { chatApiUrl, chatAuthHeaders } from '@/lib/chatApiServer';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.nextUrl.searchParams.get('apiKey');
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'apiKey is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    const conversationId = params.id;
    const urls = [
      chatApiUrl(`/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages`),
      chatApiUrl(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`),
    ];

    for (const url of urls) {
      const response = await fetch(url, { headers: chatAuthHeaders(apiKey) });
      if (response.status !== 404) {
        const text = await response.text();
        try {
          return NextResponse.json(JSON.parse(text), { status: response.status });
        } catch {
          return NextResponse.json({ success: false, error: text }, { status: response.status });
        }
      }
    }

    return NextResponse.json({ success: true, data: { messages: [] } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load messages';
    return NextResponse.json({ success: false, error: message, code: 'PROXY_ERROR' }, { status: 500 });
  }
}
