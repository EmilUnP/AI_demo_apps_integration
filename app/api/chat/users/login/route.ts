import { NextRequest, NextResponse } from 'next/server';
import { chatApiUrl, chatAuthHeaders } from '@/lib/chatApiServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, name, email, visitor_id } = body;

    if (!apiKey || !name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'apiKey, name, and email are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const payload: Record<string, string> = {
      name: name.trim(),
      email: email.trim(),
    };
    if (visitor_id) payload.visitor_id = String(visitor_id);

    const urls = [chatApiUrl('/v1/chat/users/login'), chatApiUrl('/chat/users/login')];

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

    const visitorId =
      visitor_id || `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    return NextResponse.json({
      success: true,
      data: { visitor_id: visitorId, name: payload.name, email: payload.email, localOnly: true },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ success: false, error: message, code: 'PROXY_ERROR' }, { status: 500 });
  }
}
