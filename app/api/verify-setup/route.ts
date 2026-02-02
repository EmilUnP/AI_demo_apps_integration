import { NextRequest, NextResponse } from 'next/server';

/**
 * Verification endpoint to check API key and assistant setup
 * GET /api/verify-setup?assistant=ASSISTANT_ID&apiKey=API_KEY
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const assistant = searchParams.get('assistant');
  const apiKey = searchParams.get('apiKey');

  if (!assistant || !apiKey) {
    return NextResponse.json({
      success: false,
      error: 'Missing required query parameters: assistant and apiKey',
      code: 'MISSING_PARAMS'
    }, { status: 400 });
  }

  const results: any = {
    assistant: {
      id: assistant,
      length: assistant.length,
      valid: assistant.trim().length > 0
    },
    apiKey: {
      format: apiKey.startsWith('sk_') ? 'VALID' : 'INVALID - Should start with sk_',
      length: apiKey.length,
      valid: apiKey.startsWith('sk_') && apiKey.length >= 35,
      preview: `${apiKey.substring(0, 12)}...`
    },
    endpoint: {
      url: process.env.NEXT_PUBLIC_CHAT_API_URL || 'https://www.purescan.info/api/chat',
      configured: !!process.env.NEXT_PUBLIC_CHAT_API_URL
    },
    tests: []
  };

  // Test 1: API key format
  results.tests.push({
    name: 'API Key Format',
    passed: apiKey.startsWith('sk_'),
    message: apiKey.startsWith('sk_') 
      ? 'API key format is valid' 
      : 'API key should start with sk_'
  });

  // Test 2: API key length
  results.tests.push({
    name: 'API Key Length',
    passed: apiKey.length >= 35,
    message: apiKey.length >= 35 
      ? `API key length is valid (${apiKey.length} characters)` 
      : `API key is too short (${apiKey.length} characters, should be at least 35)`
  });

  // Test 3: Assistant ID format
  results.tests.push({
    name: 'Assistant ID Format',
    passed: assistant.trim().length > 0,
    message: assistant.trim().length > 0 
      ? 'Assistant ID is valid' 
      : 'Assistant ID is empty'
  });

  // Test 4: Make actual API call
  try {
    console.log('[Verify Setup] Testing API connection to:', results.endpoint.url);
    const testResponse = await fetch(results.endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message: 'test',
        assistant: assistant.trim(),
        visitor_id: `verify-${Date.now()}`
      })
    });

    const responseText = await testResponse.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    const isSuccess = testResponse.ok;
    let errorMessage = '';
    
    if (!isSuccess) {
      // Extract error message from different possible formats
      if (responseData.error) {
        if (typeof responseData.error === 'string') {
          errorMessage = responseData.error;
        } else if (responseData.error.message) {
          errorMessage = responseData.error.message;
        } else if (responseData.error.code) {
          errorMessage = `${responseData.error.code}: ${responseData.error.message || 'Server error'}`;
        }
      } else if (responseData.message) {
        errorMessage = responseData.message;
      } else if (responseData.code && responseData.message) {
        errorMessage = `${responseData.code}: ${responseData.message}`;
      } else {
        errorMessage = 'Unknown error';
      }
    }

    results.tests.push({
      name: 'API Connection Test',
      passed: isSuccess,
      message: isSuccess 
        ? 'API connection successful - Chat endpoint is working' 
        : `API returned ${testResponse.status}: ${errorMessage || 'Unknown error'}`,
      details: {
        status: testResponse.status,
        statusText: testResponse.statusText,
        success: isSuccess,
        response: responseData,
        errorCode: responseData.code || responseData.error?.code,
        errorMessage: errorMessage
      }
    });

  } catch (error: any) {
    console.error('[Verify Setup] API connection test error:', error);
    results.tests.push({
      name: 'API Connection Test',
      passed: false,
      message: `Network error: ${error.message || 'Failed to connect to API'}`,
      details: { 
        error: error.message,
        errorType: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }

  const allPassed = results.tests.every((test: any) => test.passed);

  return NextResponse.json({
    success: allPassed,
    summary: {
      totalTests: results.tests.length,
      passed: results.tests.filter((t: any) => t.passed).length,
      failed: results.tests.filter((t: any) => !t.passed).length
    },
    results
  }, { status: allPassed ? 200 : 400 });
}

