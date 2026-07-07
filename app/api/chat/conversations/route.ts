import { NextRequest, NextResponse } from 'next/server';
import { chatApiUrl, chatAuthHeaders, parseJsonResponse } from '@/lib/chatApiServer';

const normalizeConversations = (data: unknown): Record<string, string>[] => {
  if (Array.isArray(data)) return data as Record<string, string>[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.conversations)) return obj.conversations as Record<string, string>[];
    if (Array.isArray(obj.items)) return obj.items as Record<string, string>[];
  }
  return [];
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const apiKey = searchParams.get('apiKey');
    const externalUserId =
      searchParams.get('external_user_id') || searchParams.get('visitor_id');

    if (!apiKey || !externalUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'apiKey and external_user_id are required',
          code: 'MISSING_PARAMS',
        },
        { status: 400 }
      );
    }

    const v1Query = new URLSearchParams({
      action: 'conversations',
      external_user_id: externalUserId,
      limit: searchParams.get('limit') || '20',
    });
    if (searchParams.get('offset')) v1Query.set('offset', searchParams.get('offset')!);

    const legacyQuery = new URLSearchParams({ visitor_id: externalUserId });
    const assistant = searchParams.get('assistant');
    if (assistant) legacyQuery.set('assistant', assistant);

    const endpoints = [
      chatApiUrl(`/v1/data?${v1Query}`),
      chatApiUrl(`/v1/chat/conversations?${legacyQuery}`),
      chatApiUrl(`/chat/conversations?${legacyQuery}`),
    ];

    for (const url of endpoints) {
      const response = await fetch(url, { headers: chatAuthHeaders(apiKey) });
      if (response.status === 404) continue;

      const parsed = (await parseJsonResponse(response)) as {
        success?: boolean;
        data?: unknown;
        error?: string;
      };

      if (parsed.success === false) {
        return NextResponse.json(parsed, { status: response.status });
      }

      const list = normalizeConversations(parsed.data);
      return NextResponse.json(
        { success: true, data: list },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load conversations';
    return NextResponse.json({ success: false, error: message, code: 'PROXY_ERROR' }, { status: 500 });
  }
}
