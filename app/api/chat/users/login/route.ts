import { NextRequest, NextResponse } from 'next/server';
import {
  missingAssistantKeyResponse,
  resolveAssistantApiKey,
  safeErrorMessage,
  upstreamJson,
  validationErrorResponse,
} from '@/lib/chatApiServer';
import { loginProxyRequestSchema } from '@/lib/chatTypes';

const createVisitorId = (): string =>
  `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginProxyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
    }

    const { assistantId, name, email, visitor_id } = parsed.data;
    const apiKey = resolveAssistantApiKey(assistantId, 'chat');
    if (!apiKey) {
      return NextResponse.json(missingAssistantKeyResponse(assistantId, 'chat'), { status: 503 });
    }

    const payload: Record<string, string> = { name, email };
    if (visitor_id) payload.visitor_id = visitor_id;

    try {
      const { response, data } = await upstreamJson('/v1/chat/users/login', apiKey, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.status !== 404) {
        const record = data as { success?: boolean };
        if (response.ok && record.success !== false) {
          return NextResponse.json(data, { status: response.status });
        }
        // Fall through to local visitor when upstream login is unavailable
        if (response.status >= 500 || response.status === 404) {
          // continue below
        } else if (record.success === false) {
          return NextResponse.json(data, { status: response.status });
        }
      }
    } catch {
      // Local fallback below
    }

    const visitorId = visitor_id || createVisitorId();
    return NextResponse.json({
      success: true,
      data: { visitor_id: visitorId, name, email, localOnly: true },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: safeErrorMessage(error, 'Login failed'),
        code: 'PROXY_ERROR',
      },
      { status: 500 }
    );
  }
}
