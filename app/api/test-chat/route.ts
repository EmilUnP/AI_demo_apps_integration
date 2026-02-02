import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify API integration
 * Use this to test if your API key and assistant ID work correctly
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message = 'Hello, this is a test message', assistant, apiKey } = body;

    if (!assistant || !apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: assistant and apiKey are required',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || 'https://www.purescan.info/api/chat';
    
    console.log('[Test] Testing API integration...');
    console.log('[Test] Endpoint:', apiUrl);
    console.log('[Test] Assistant:', assistant);
    console.log('[Test] API Key format:', apiKey.startsWith('sk_') ? 'VALID' : 'INVALID');
    console.log('[Test] API Key length:', apiKey.length);

    const requestPayload = {
      message: message.trim(),
      assistant: assistant.trim(),
      visitor_id: `test-visitor-${Date.now()}`
    };

    // Test 1: Basic request
    console.log('[Test] Sending test request...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();

    console.log('[Test] Response Status:', response.status);
    console.log('[Test] Response Headers:', {
      'content-type': contentType,
      'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
      'x-ratelimit-reset': response.headers.get('x-ratelimit-reset')
    });
    console.log('[Test] Raw Response:', responseText.substring(0, 500));

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = { raw: responseText };
    }

    // Return detailed test results
    return NextResponse.json({
      success: response.ok,
      testResults: {
        endpoint: apiUrl,
        requestPayload,
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: {
            'content-type': contentType,
            'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
            'x-ratelimit-reset': response.headers.get('x-ratelimit-reset')
          },
          body: parsedResponse
        },
        apiKey: {
          format: apiKey.startsWith('sk_') ? 'VALID' : 'INVALID',
          length: apiKey.length,
          preview: `${apiKey.substring(0, 12)}...`
        },
        assistant: {
          id: assistant,
          length: assistant.length
        }
      },
      diagnostics: {
        networkError: false,
        parseError: false,
        apiError: !response.ok,
        errorDetails: response.ok ? null : parsedResponse
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Test failed',
      code: 'TEST_ERROR',
      diagnostics: {
        networkError: error.message?.includes('fetch') || error.message?.includes('network'),
        parseError: error.message?.includes('JSON'),
        apiError: false,
        errorDetails: {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      }
    }, { status: 500 });
  }
}

