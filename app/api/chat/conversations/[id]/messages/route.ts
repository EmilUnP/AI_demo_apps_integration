import { NextRequest, NextResponse } from 'next/server';
import { chatApiUrl, chatAuthHeaders, parseJsonResponse } from '@/lib/chatApiServer';

const normalizeMessages = (data: unknown): Record<string, string>[] => {
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.messages)) return obj.messages as Record<string, string>[];
  if (Array.isArray(data)) return data as Record<string, string>[];
  return [];
};

const extractStatus = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  const status = (data as Record<string, unknown>).status;
  return typeof status === 'string' ? status : undefined;
};

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
    const v1Query = new URLSearchParams({
      action: 'conversations',
      id: conversationId,
    });

    const endpoints = [
      chatApiUrl(`/v1/data?${v1Query}`),
      chatApiUrl(`/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages`),
      chatApiUrl(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`),
    ];

    for (const url of endpoints) {
      const response = await fetch(url, { headers: chatAuthHeaders(apiKey) });
      if (response.status === 404) continue;

      const parsed = (await parseJsonResponse(response)) as {
        success?: boolean;
        data?: unknown;
      };

      const messages = normalizeMessages(parsed.data);
      const status = extractStatus(parsed.data);

      if (messages.length > 0 || status || parsed.success !== false) {
        return NextResponse.json(
          { success: true, data: { messages, status: status || 'active' } },
          { status: response.status }
        );
      }
    }

    return NextResponse.json({ success: true, data: { messages: [], status: 'active' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load messages';
    return NextResponse.json({ success: false, error: message, code: 'PROXY_ERROR' }, { status: 500 });
  }
}
