'use client';

import { useState, useEffect } from 'react';

export default function TestAPIPage() {
  const [assistant, setAssistant] = useState('əmək-məcələsi-1760266330650');
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState('Hello, this is a test message');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Auto-scroll to failed tests
  useEffect(() => {
    if (result && result.summary && result.summary.failed > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const failedTest = document.querySelector('.bg-red-100.border-red-400');
        if (failedTest) {
          failedTest.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [result]);

  const runTest = async (testType: 'verify' | 'test-chat') => {
    if (!assistant || !apiKey) {
      alert('Please enter assistant ID and API key');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (testType === 'verify') {
        // Test verify endpoint
        const response = await fetch(
          `/api/verify-setup?assistant=${encodeURIComponent(assistant)}&apiKey=${encodeURIComponent(apiKey)}`
        );
        const data = await response.json();
        setResult(data);
      } else {
        // Test chat endpoint
        const response = await fetch('/api/test-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            assistant,
            apiKey,
            message
          })
        });
        const data = await response.json();
        setResult(data);
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Test failed',
        code: 'TEST_ERROR'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">API Integration Test</h1>
        <p className="text-gray-600 mb-6">Test and verify your API key and assistant setup</p>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assistant ID (share_link)
            </label>
            <input
              type="text"
              value={assistant}
              onChange={(e) => setAssistant(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              placeholder="e.g., əmək-məcələsi-1760266330650"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              placeholder="sk_..."
            />
            <p className="mt-2 text-sm text-gray-600">
              API key should start with <code className="bg-gray-200 px-2 py-1 rounded font-mono text-gray-800">sk_</code> and be at least 35 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Message (for chat test)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              placeholder="Enter test message..."
            />
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => runTest('verify')}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
          >
            {loading ? 'Running...' : '1. Verify Setup'}
          </button>
          
          <button
            onClick={() => runTest('test-chat')}
            disabled={loading}
            className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
          >
            {loading ? 'Running...' : '2. Test Chat API'}
          </button>
        </div>

        {result && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Test Results</h2>
            <div className={`p-6 rounded-xl border-2 ${result.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="flex items-center mb-4">
                <span className={`text-2xl font-bold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? '✓ Success' : '✗ Failed'}
                </span>
              </div>
              
              {result.code && (
                <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                  <span className="font-semibold text-gray-700">Error Code:</span> 
                  <span className="ml-2 font-mono text-gray-900">{result.code}</span>
                </div>
              )}
              
              {result.error && (
                <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                  <span className="font-semibold text-gray-700">Error:</span>
                  <div className="mt-2 text-gray-900 whitespace-pre-wrap break-words">
                    {typeof result.error === 'string' ? result.error : JSON.stringify(result.error, null, 2)}
                  </div>
                </div>
              )}

              {result.summary && (
                <div className={`mb-4 p-4 rounded-lg border-2 ${result.summary.passed === result.summary.totalTests ? 'bg-green-100 border-green-400' : 'bg-orange-100 border-orange-400'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-900 text-lg">Test Summary:</span>
                    <span className={`text-xl font-bold ${result.summary.passed === result.summary.totalTests ? 'text-green-700' : 'text-orange-700'}`}>
                      {result.summary.passed}/{result.summary.totalTests} tests passed
                    </span>
                  </div>
                  
                  {result.summary.failed > 0 && result.tests && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border-2 border-red-300">
                      <div className="flex items-center mb-2">
                        <span className="text-lg font-bold text-red-800 mr-2">⚠ Failed Tests:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {result.tests.filter((t: any) => !t.passed).map((test: any, index: number) => (
                          <li key={index} className="text-red-900 font-semibold">
                            <span className="text-red-700">✗</span> {test.name} - {test.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.summary.passed > 0 && result.tests && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-300">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-semibold text-green-800 mr-2">✓ Passed Tests:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.tests.filter((t: any) => t.passed).map((test: any, index: number) => (
                          <span key={index} className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full">
                            {test.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {result.tests && (
                <div className="mt-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-3 text-xl">Test Details:</h3>
                  {result.tests.map((test: any, index: number) => (
                    <div 
                      key={index} 
                      className={`p-5 rounded-lg border-2 ${test.passed ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-400 shadow-lg'}`}
                      style={!test.passed ? { animation: 'pulse 2s infinite' } : {}}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xl font-bold ${test.passed ? 'text-green-800' : 'text-red-800'}`}>
                          {test.passed ? '✓' : '✗'} {test.name}
                        </span>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold ${test.passed ? 'bg-green-200 text-green-800' : 'bg-red-300 text-red-900'}`}>
                          {test.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                      <p className={`text-base mt-2 font-semibold ${test.passed ? 'text-green-900' : 'text-red-900'}`}>
                        {test.message}
                      </p>
                      {test.details && Object.keys(test.details).length > 0 && (
                        <div className="mt-4">
                          <details className="cursor-pointer" open={!test.passed}>
                            <summary className="text-sm font-semibold text-gray-800 mb-2 hover:text-gray-900">
                              {test.passed ? 'Click to view details' : '▼ Error Details (click to collapse)'}
                            </summary>
                            <div className="mt-2 bg-white p-4 rounded border-2 border-gray-300">
                              {test.details.errorCode && (
                                <div className="mb-3">
                                  <span className="font-semibold text-gray-700">Error Code:</span>
                                  <span className="ml-2 font-mono text-red-700 font-bold">{test.details.errorCode}</span>
                                </div>
                              )}
                              {test.details.errorMessage && (
                                <div className="mb-3">
                                  <span className="font-semibold text-gray-700">Error Message:</span>
                                  <div className="mt-1 p-2 bg-red-50 rounded text-red-900 font-medium">
                                    {test.details.errorMessage}
                                  </div>
                                </div>
                              )}
                              {test.details.status && (
                                <div className="mb-3">
                                  <span className="font-semibold text-gray-700">HTTP Status:</span>
                                  <span className="ml-2 font-mono font-bold">{test.details.status} {test.details.statusText}</span>
                                </div>
                              )}
                              <pre className="text-xs mt-3 bg-gray-900 text-green-400 p-4 rounded border border-gray-700 overflow-auto max-h-64 font-mono">
                                {JSON.stringify(test.details, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.testResults && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Full Test Results:</h3>
                  <pre className="mt-2 text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 border border-gray-700 font-mono">
                    {JSON.stringify(result.testResults || result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 p-5 bg-blue-50 border-2 border-blue-300 rounded-xl">
          <h3 className="font-semibold mb-3 text-blue-900">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-800">
            <li>Enter your Assistant ID (share_link) - e.g., <code className="bg-white px-2 py-1 rounded font-mono text-blue-700 border border-blue-200">əmək-məcələsi-1760266330650</code></li>
            <li>Enter your API Key (starts with <code className="bg-white px-2 py-1 rounded font-mono text-blue-700 border border-blue-200">sk_</code>)</li>
            <li>Click <strong className="text-blue-900">"1. Verify Setup"</strong> to check if your API key format is correct and test the connection</li>
            <li>Click <strong className="text-blue-900">"2. Test Chat API"</strong> to send a test message and see the full API response</li>
            <li>Check the results below for detailed diagnostics</li>
          </ol>
        </div>

        <div className="mt-4 p-5 bg-amber-50 border-2 border-amber-300 rounded-xl">
          <h3 className="font-semibold mb-3 text-amber-900">Direct API Endpoints:</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
            <li>
              <code className="bg-white px-2 py-1 rounded font-mono text-amber-800 border border-amber-200">GET /api/verify-setup?assistant=ASSISTANT_ID&apiKey=API_KEY</code>
              <span className="text-gray-600 ml-2">- Verify API key and assistant setup</span>
            </li>
            <li>
              <code className="bg-white px-2 py-1 rounded font-mono text-amber-800 border border-amber-200">POST /api/test-chat</code>
              <span className="text-gray-600 ml-2">- Test chat API with full diagnostics</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

