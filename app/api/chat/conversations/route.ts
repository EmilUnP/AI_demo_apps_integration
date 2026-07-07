import { NextRequest, NextResponse } from 'next/server';
import { chatApiUrl, chatAuthHeaders } from '@/lib/chatApiServer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const apiKey = searchParams.get('apiKey');
    const visitorId = searchParams.get('visitor_id');
    const assistant = searchParams.get('assistant');

    if (!apiKey || !visitorId) {
      return NextResponse.json(
        { success: false, error: 'apiKey and visitor_id are required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    const query = new URLSearchParams({ visitor_id: visitorId });
    if (assistant) query.set('assistant', assistant);

    const urls = [
      chatApiUrl(`/v1/chat/conversations?${query}`),
      chatApiUrl(`/chat/conversations?${query}`),
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

    return NextResponse.json({ success: true, data: [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load conversations';
    return NextResponse.json({ success: false, error: message, code: 'PROXY_ERROR' }, { status: 500 });
  }
}
