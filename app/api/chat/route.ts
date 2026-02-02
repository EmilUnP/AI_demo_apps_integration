import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { message, assistant, visitor_id, apiKey } = body;

    // Validate required fields
    if (!message || !assistant || !apiKey) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'message, assistant, and apiKey are required' 
        },
        { status: 400 }
      );
    }

    // Prepare request payload according to API documentation
    // Required fields: message, assistant (share_link)
    // Optional: visitor_id
    const requestPayload = {
      message: message.trim(),
      assistant: assistant.trim(), // This should be the assistant's share_link
      visitor_id: visitor_id || `visitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // External API endpoint - according to documentation it's /api/chat (NOT /api/v1/chat)
    const apiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || 'https://www.purescan.info/api/chat';
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`, // Format: Bearer YOUR_API_KEY
      'Accept': 'application/json'
    };

    console.log('[API Proxy] ========================================');
    console.log('[API Proxy] Making request to:', apiUrl);
    console.log('[API Proxy] Request payload:', {
      messageLength: message.length,
      messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      assistant: assistant, // This should be the share_link
      assistantLength: assistant.length,
      hasVisitorId: !!visitor_id,
      visitorId: visitor_id,
      hasApiKey: !!apiKey,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 12)}...` : 'MISSING',
      apiKeyLength: apiKey?.length || 0,
      apiKeyFormat: apiKey?.startsWith('sk_') ? 'VALID ✓' : 'INVALID ✗ (should start with sk_)',
      apiKeyValid: apiKey?.startsWith('sk_') && apiKey.length >= 35
    });
    console.log('[API Proxy] ========================================');

    // Make request to API
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestPayload)
      });

      console.log('[API Proxy] ========================================');
      console.log('[API Proxy] Response Status:', response.status, response.statusText);
      console.log('[API Proxy] Response Headers:', {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
        'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
        'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
        'x-request-id': response.headers.get('x-request-id')
      });
    } catch (error: any) {
      console.error('[API Proxy] Network error:', error);
      return NextResponse.json(
        { error: 'Failed to connect to chat API', details: error.message },
        { status: 503 }
      );
    }

    // Parse response according to API documentation
    // Success: { success: true, data: { response: "...", ... } }
    // Error: { success: false, error: "...", code: "..." }
    const contentType = response.headers.get('content-type') || '';
    let apiResponse: any;

    try {
      const responseText = await response.text();
      console.log('[API Proxy] Raw response length:', responseText.length);
      
      if (contentType.includes('application/json') || responseText.trim().startsWith('{')) {
        apiResponse = JSON.parse(responseText);
        console.log('[API Proxy] Parsed response:', {
          hasSuccess: 'success' in apiResponse,
          success: apiResponse.success,
          hasError: 'error' in apiResponse,
          hasData: 'data' in apiResponse,
          code: apiResponse.code
        });
      } else {
        // Not JSON - wrap as error object
        apiResponse = { 
          success: false,
          error: responseText || `HTTP ${response.status}: ${response.statusText}`,
          code: 'INVALID_RESPONSE'
        };
      }

      // Log full parsed response for debugging
      console.log('[API Proxy] Full parsed response:', JSON.stringify(apiResponse, null, 2));

      // If response format is according to documentation
      if (apiResponse.success === true && apiResponse.data) {
        // Success response - return the data
        console.log('[API Proxy] ✓ Success response received');
        return NextResponse.json(apiResponse, { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (apiResponse.success === false) {
        // Error response - return with appropriate status code
        console.log('[API Proxy] ✗ Error response:', {
          code: apiResponse.code,
          error: apiResponse.error,
          message: apiResponse.message
        });
        const statusCode = response.status === 200 ? 400 : response.status;
        return NextResponse.json(apiResponse, { 
          status: statusCode,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (apiResponse.error) {
        // Handle nested error format: { error: { code: "500", message: "..." } }
        const errorObj = typeof apiResponse.error === 'object' ? apiResponse.error : {};
        const errorCode = apiResponse.code || errorObj.code || String(response.status);
        const errorMessage = apiResponse.message || errorObj.message || 
                           (typeof apiResponse.error === 'string' ? apiResponse.error : 'Unknown error');
        
        console.log('[API Proxy] ✗ Error format detected:', {
          code: errorCode,
          message: errorMessage,
          errorStructure: apiResponse.error
        });
        
        // Wrap in standard format according to documentation
        return NextResponse.json({
          success: false,
          code: errorCode,
          error: errorMessage,
          details: apiResponse.details || errorObj
        }, { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (apiResponse.code || apiResponse.message) {
        // Format: { code: "500", message: "..." } - flat structure
        console.log('[API Proxy] ✗ Error format detected (flat):', {
          code: apiResponse.code,
          message: apiResponse.message
        });
        // Wrap in standard format
        return NextResponse.json({
          success: false,
          code: apiResponse.code || String(response.status),
          error: apiResponse.message || 'Unknown error',
          details: apiResponse
        }, { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Legacy format or unknown format - pass through as is
        console.log('[API Proxy] ⚠ Unknown response format, passing through');
        return NextResponse.json(apiResponse, { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (parseError: any) {
      console.error('[API Proxy] Error parsing response:', parseError);
      return NextResponse.json({ 
        success: false,
        error: `Failed to parse response: ${parseError.message}`,
        code: 'PARSE_ERROR',
        details: parseError.message
      }, { 
        status: response.status || 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('[API Proxy] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
