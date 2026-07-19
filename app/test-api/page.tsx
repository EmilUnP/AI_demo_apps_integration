'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ASSISTANT_IDS, CHAT_LANGUAGE_OPTIONS, ChatLanguage } from '@/lib/chatTypes';

export default function TestAPIPage() {
  const [assistantId, setAssistantId] = useState<(typeof ASSISTANT_IDS)[number]>('personaai-guide');
  const [message, setMessage] = useState('Hello, this is a test message');
  const [language, setLanguage] = useState<ChatLanguage>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => {
    if (!result || typeof result !== 'object') return;
    const summary = (result as { summary?: { failed?: number } }).summary;
    if (summary && (summary.failed ?? 0) > 0) {
      setTimeout(() => {
        const failedTest = document.querySelector('.bg-red-100.border-red-400');
        if (failedTest) failedTest.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [result]);

  const runTest = async (testType: 'verify' | 'test-chat') => {
    setLoading(true);
    setResult(null);

    try {
      if (testType === 'verify') {
        const response = await fetch(
          `/api/verify-setup?assistantId=${encodeURIComponent(assistantId)}`
        );
        setResult(await response.json());
      } else {
        const response = await fetch('/api/test-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assistantId, message, language }),
        });
        setResult(await response.json());
      }
    } catch (error: unknown) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
        code: 'TEST_ERROR',
      });
    } finally {
      setLoading(false);
    }
  };

  const summary =
    result && typeof result === 'object'
      ? (result as { summary?: { totalTests?: number; passed?: number; failed?: number } }).summary
      : undefined;
  const tests =
    result && typeof result === 'object'
      ? (
          result as {
            results?: { tests?: Array<{ name: string; passed: boolean; message: string }> };
          }
        ).results?.tests
      : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">API Integration Test</h1>
            <p className="text-gray-600">
              Uses server-held keys from <code className="bg-gray-100 px-1 rounded">.env.local</code>
              — no browser API keys.
            </p>
          </div>
          <Link href="/assistants" className="text-sm text-indigo-600 hover:underline">
            ← Assistants
          </Link>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assistant ID</label>
            <select
              value={assistantId}
              onChange={(e) =>
                setAssistantId(e.target.value as (typeof ASSISTANT_IDS)[number])
              }
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              {ASSISTANT_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as ChatLanguage)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              {CHAT_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            type="button"
            disabled={loading}
            onClick={() => void runTest('verify')}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Verify setup'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void runTest('test-chat')}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Test chat'}
          </button>
        </div>

        {summary && (
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-100 p-3">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-xl font-semibold">{summary.totalTests ?? 0}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Passed</p>
              <p className="text-xl font-semibold text-emerald-700">{summary.passed ?? 0}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs text-red-700">Failed</p>
              <p className="text-xl font-semibold text-red-700">{summary.failed ?? 0}</p>
            </div>
          </div>
        )}

        {tests && tests.length > 0 && (
          <div className="space-y-2 mb-6">
            {tests.map((test) => (
              <div
                key={test.name}
                className={`rounded-lg border px-4 py-3 ${
                  test.passed
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-red-100 border-red-400'
                }`}
              >
                <p className="font-medium text-sm">{test.name}</p>
                <p className="text-sm text-slate-700 mt-1">{test.message}</p>
              </div>
            ))}
          </div>
        )}

        {result != null && (
          <pre className="overflow-auto rounded-lg bg-slate-900 text-slate-100 p-4 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
