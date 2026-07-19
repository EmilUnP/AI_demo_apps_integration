import { NextRequest, NextResponse } from 'next/server';
import {
  getChatApiBase,
  isDevDiagnosticsEnabled,
  listConfiguredAssistants,
  missingAssistantKeyResponse,
  resolveAssistantApiKey,
  safeErrorMessage,
  upstreamJson,
  validationErrorResponse,
} from '@/lib/chatApiServer';
import { assistantIdSchema } from '@/lib/chatTypes';
import { z } from 'zod';

const querySchema = z.object({
  assistantId: assistantIdSchema.optional().default('personaai-guide'),
});

/**
 * Verification endpoint — uses server-held keys only.
 * GET /api/verify-setup?assistantId=personaai-guide
 */
export async function GET(request: NextRequest) {
  if (!isDevDiagnosticsEnabled()) {
    return NextResponse.json(
      { success: false, error: 'Diagnostics disabled', code: 'DIAGNOSTICS_DISABLED' },
      { status: 403 }
    );
  }

  try {
    const parsed = querySchema.safeParse({
      assistantId: request.nextUrl.searchParams.get('assistantId') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), { status: 400 });
    }

    const { assistantId } = parsed.data;
    const apiKey = resolveAssistantApiKey(assistantId, 'chat');
    const configured = listConfiguredAssistants();

    const results = {
      assistantId,
      apiBase: getChatApiBase(),
      assistants: configured,
      tests: [] as Array<{ name: string; passed: boolean; message: string }>,
    };

    results.tests.push({
      name: 'API Key Configured',
      passed: !!apiKey,
      message: apiKey
        ? 'Server API key is configured for this assistant'
        : 'No CHAT_API_KEY configured for this assistant',
    });

    results.tests.push({
      name: 'API Base URL',
      passed: !!getChatApiBase(),
      message: `Using ${getChatApiBase()}`,
    });

    if (!apiKey) {
      const missing = missingAssistantKeyResponse(assistantId, 'chat');
      return NextResponse.json(
        {
          ...missing,
          summary: {
            totalTests: results.tests.length,
            passed: results.tests.filter((t) => t.passed).length,
            failed: results.tests.filter((t) => !t.passed).length,
          },
          results,
        },
        { status: 503 }
      );
    }

    try {
      const { response, data } = await upstreamJson('/v1/chat', apiKey, {
        method: 'POST',
        body: JSON.stringify({
          message: 'test',
          language: 'auto',
          external_user_id: `verify-${Date.now()}`,
          new_conversation: true,
          stream: false,
        }),
      });

      const payload = data as { success?: boolean; error?: string; code?: string };
      const isSuccess = response.ok && payload.success !== false;
      results.tests.push({
        name: 'API Connection Test',
        passed: isSuccess,
        message: isSuccess
          ? 'API connection successful'
          : `API returned ${response.status}: ${payload.error || payload.code || 'Unknown error'}`,
      });
    } catch (error: unknown) {
      results.tests.push({
        name: 'API Connection Test',
        passed: false,
        message: safeErrorMessage(error, 'Failed to connect to API'),
      });
    }

    const allPassed = results.tests.every((test) => test.passed);
    return NextResponse.json(
      {
        success: allPassed,
        summary: {
          totalTests: results.tests.length,
          passed: results.tests.filter((t) => t.passed).length,
          failed: results.tests.filter((t) => !t.passed).length,
        },
        results,
      },
      { status: allPassed ? 200 : 400 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: safeErrorMessage(error, 'Verification failed'),
        code: 'VERIFY_ERROR',
      },
      { status: 500 }
    );
  }
}
