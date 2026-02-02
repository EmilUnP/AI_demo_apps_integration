'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const DEFAULT_BASE_URL = 'http://localhost:4000/api/v1/teacher';

const EXAM_WITH_DOCUMENT_ID = {
  document_id: 'uuid-from-documents-upload',
  title: 'Quiz 1',
  subject: 'Math',
  grade_level: '10',
  topics: 'algebra, equations',
  language: 'en',
  settings: {
    question_count: 10,
    difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
    question_types: ['multiple_choice', 'true_false'],
    include_explanations: true,
    include_hints: true,
  },
};

const EXAM_WITH_DOCUMENT_TEXT = {
  document_text: 'Your lesson or chapter text (at least 50 characters). Add more content here to generate better exam questions...',
  title: 'Quiz 1',
  subject: 'Math',
  grade_level: '10',
  language: 'en',
  settings: {
    question_count: 10,
    difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
    question_types: ['multiple_choice', 'true_false'],
    include_explanations: true,
    include_hints: true,
  },
};

const LESSON_EXAMPLE_TEXT = {
  document_id: 'uuid-from-documents-upload',
  topic: 'Introduction to Fractions',
  include: 'text',
};

const LESSON_EXAMPLE_IMAGES = {
  document_id: 'uuid-from-documents-upload',
  topic: 'Introduction to Fractions',
  include: 'text_and_images',
};

const LESSON_EXAMPLE_AUDIO = {
  document_id: 'uuid-from-documents-upload',
  topic: 'Introduction to Fractions',
  include: 'text_and_audio',
};

const LESSON_EXAMPLE_FULL = {
  document_id: 'uuid-from-documents-upload',
  topic: 'Introduction to Fractions',
  include: 'full',
  language: 'English',
};

type MainTab = 'documents' | 'exam' | 'lesson';

const TEST_API_KEY = typeof process.env.NEXT_PUBLIC_EDUSPACE_TEST_API_KEY === 'string'
  ? process.env.NEXT_PUBLIC_EDUSPACE_TEST_API_KEY.trim()
  : '';

export default function EduSpaceIntegrationPage() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(TEST_API_KEY);
  const [mainTab, setMainTab] = useState<MainTab>('documents');
  const [examPayload, setExamPayload] = useState(JSON.stringify(EXAM_WITH_DOCUMENT_ID, null, 2));
  const [lessonPayload, setLessonPayload] = useState(JSON.stringify(LESSON_EXAMPLE_TEXT, null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status?: number; data?: unknown; error?: string } | null>(null);
  const [keyVerified, setKeyVerified] = useState<boolean | null>(null);

  // Documents: upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Documents: list
  const [listPage, setListPage] = useState(1);
  const [listPerPage, setListPerPage] = useState(10);

  // Documents: get one
  const [documentId, setDocumentId] = useState('');

  const normalizeApiKey = (key: string) => {
    const trimmed = key.trim();
    return trimmed.startsWith('Bearer ') ? trimmed.slice(7).trim() : trimmed;
  };

  const getHeaders = (omitContentType = false): Record<string, string> => {
    const token = normalizeApiKey(apiKey);
    const h: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!omitContentType) h['Content-Type'] = 'application/json';
    return h;
  };

  const verifyApiKey = async () => {
    if (!baseUrl?.trim() || !apiKey?.trim()) {
      setKeyVerified(false);
      setResult({ error: 'Enter base URL and API key first.' });
      return;
    }
    setKeyVerified(null);
    setLoading(true);
    setResult(null);
    const url = baseUrl.replace(/\/$/, '') + '/documents?page=1&per_page=1';
    try {
      const response = await fetch(url, { headers: getHeaders() });
      const ok = response.status >= 200 && response.status < 300;
      setKeyVerified(ok);
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      if (ok) {
        const data = isJson ? await response.json() : await response.text();
        setResult({ status: response.status, data, error: undefined });
      } else {
        const raw = await response.text();
        const data = isJson ? (() => { try { return JSON.parse(raw); } catch { return { error: raw }; } })() : { error: raw };
        setResult({ status: response.status, data, error: undefined });
      }
    } catch (err: unknown) {
      setKeyVerified(false);
      const msg = err instanceof Error ? err.message : 'Request failed';
      const isNetwork = /failed|network|cors|fetch/i.test(msg);
      setResult({
        error: isNetwork
          ? 'Network error — is the EduSpace API running at the base URL? If this site and the API are on different origins, the API must allow CORS for this origin.'
          : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const runDocumentsUpload = async () => {
    if (!baseUrl?.trim() || !apiKey?.trim()) {
      setResult({ error: 'Base URL and API key are required.' });
      return;
    }
    if (!uploadFile) {
      setResult({ error: 'Choose a file (PDF, text, or markdown). Max 50MB.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = baseUrl.replace(/\/$/, '') + '/documents/upload';
    const token = normalizeApiKey(apiKey);
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = response.ok
        ? await response.json()
        : { error: await response.text() };
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setLoading(false);
    }
  };

  const runDocumentsList = async () => {
    if (!baseUrl?.trim() || !apiKey?.trim()) {
      setResult({ error: 'Base URL and API key are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = baseUrl.replace(/\/$/, '') + `/documents?page=${listPage}&per_page=${listPerPage}`;
    try {
      const response = await fetch(url, { headers: getHeaders() });
      const data = response.ok ? await response.json() : { error: await response.text() };
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runDocumentsGet = async () => {
    if (!baseUrl?.trim() || !apiKey?.trim()) {
      setResult({ error: 'Base URL and API key are required.' });
      return;
    }
    if (!documentId?.trim()) {
      setResult({ error: 'Enter a document ID (UUID).' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = baseUrl.replace(/\/$/, '') + `/documents/${encodeURIComponent(documentId.trim())}`;
    try {
      const response = await fetch(url, { headers: getHeaders() });
      const data = response.ok ? await response.json() : { error: await response.text() };
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runExamOrLesson = async () => {
    if (!baseUrl?.trim()) {
      setResult({ error: 'Please enter EduSpace API base URL' });
      return;
    }
    if (!apiKey?.trim()) {
      setResult({ error: 'API key is required. Use Authorization: Bearer YOUR_API_KEY.' });
      return;
    }

    setLoading(true);
    setResult(null);

    const path = mainTab === 'exam' ? '/exams/generate' : '/lessons/generate';
    const fullUrl = baseUrl.replace(/\/$/, '') + path;
    const payload = mainTab === 'exam' ? examPayload : lessonPayload;

    try {
      const body = JSON.parse(payload || '{}');
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get('content-type');
      let data: unknown;
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      setResult({
        status: response.status,
        data: response.ok ? data : { error: data },
      });
    } catch (e) {
      if (e instanceof SyntaxError) {
        setResult({ error: 'Invalid JSON in request body' });
      } else {
        setResult({
          error: e instanceof Error ? e.message : 'Request failed (check CORS if calling from another origin)',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              Demo Səhifə
            </Link>
            <div className="flex gap-6 items-center">
              <Link href="/" className="text-slate-300 hover:text-indigo-300 transition-colors">Ana səhifə</Link>
              <Link href="/assistants" className="text-slate-300 hover:text-indigo-300 transition-colors">Köməkçilər</Link>
              <Link href="/test-api" className="text-slate-300 hover:text-indigo-300 transition-colors">Test API</Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-100 mb-2">EduSpace API Integration</h1>
          <p className="text-slate-400 text-lg">
            Use your own apps to generate new exams and lessons via the EduSpace API. Create an API key, call the endpoints, and track usage in the Usage tab.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 text-slate-300 text-sm">
            <h3 className="font-semibold text-slate-200 mb-2">How it works</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li><strong>Keys & documentation</strong> — Create an API key and copy the two endpoints (exam and lesson generation) with real request bodies and options.</li>
              <li><strong>Usage</strong> — See how many requests were made, how many succeeded or failed, and per-key and per-endpoint breakdown (in EduSpace).</li>
            </ol>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 text-sm">
            <strong className="text-slate-200">Port setup:</strong> EduSpace app on <code className="bg-slate-900 px-1 rounded">3000</code>/<code className="bg-slate-900 px-1 rounded">3001</code>, EduSpace backend on <code className="bg-slate-900 px-1 rounded">4000</code>, this demo on <code className="bg-slate-900 px-1 rounded">3002</code>. Base URL should point to the backend: <code className="bg-slate-900 px-1 rounded">http://localhost:4000/api/v1/teacher</code>. Because this demo (3002) and the API (4000) are different origins, the EduSpace backend must allow CORS for <code className="bg-slate-900 px-1 rounded">http://localhost:3002</code>.
          </div>
        </div>

        {/* Recommended flow */}
        <div className="mb-10 p-6 rounded-2xl bg-indigo-950/30 border border-indigo-800/50">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Recommended: Document flow (upload → RAG → exams & lessons)</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-400">
            <li><strong className="text-slate-300">Upload</strong> — POST /documents/upload with your PDF/text/markdown file (multipart). You get <code className="bg-slate-800 px-1 rounded">document_id</code> and <code className="bg-slate-800 px-1 rounded">processing_status</code>: &quot;processing&quot;.</li>
            <li><strong className="text-slate-300">Wait for RAG</strong> — Poll GET /documents/:id until <code className="bg-slate-800 px-1 rounded">processing_status</code> is completed. Then the document is ready for exam/lesson generation.</li>
            <li><strong className="text-slate-300">Exams</strong> — Call POST /exams/generate with <code className="bg-slate-800 px-1 rounded">document_id</code> (or <code className="bg-slate-800 px-1 rounded">document_ids</code>). The API uses RAG to pull relevant content and generate questions.</li>
            <li><strong className="text-slate-300">Lessons</strong> — Call POST /lessons/generate with <code className="bg-slate-800 px-1 rounded">document_id</code> and <code className="bg-slate-800 px-1 rounded">topic</code>. Same RAG-based generation as in the app.</li>
          </ol>
          <p className="mt-3 text-sm text-slate-500">You can also send raw <code className="bg-slate-800 px-1 rounded">document_text</code> for exams if you prefer not to upload files.</p>
        </div>

        {/* Base URL & API Key */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">EduSpace API Base URL</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="http://localhost:4000/api/v1/teacher"
            />
            <p className="mt-1 text-sm text-slate-500">Use your Vercel URL when deployed (e.g. https://your-app.vercel.app/api/v1/teacher).</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">API Key <span className="text-amber-400">(required)</span></label>
            <div className="flex gap-3 items-center flex-wrap">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setKeyVerified(null); }}
                className="flex-1 min-w-[200px] px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Paste key only (e.g. edsk_...)"
              />
              <button
                type="button"
                onClick={verifyApiKey}
                disabled={loading || !apiKey.trim()}
                className="px-4 py-3 bg-slate-700 text-slate-200 font-medium rounded-xl hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600"
              >
                {loading ? 'Checking…' : 'Verify API key'}
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">Calls GET /documents to confirm the key works. If verify succeeds but upload fails, the EduSpace API may not be reading the Authorization header for multipart uploads.</p>
            {TEST_API_KEY && <p className="mt-1 text-sm text-indigo-400">Test key from <code className="bg-slate-800 px-1 rounded">.env.local</code> is pre-filled. Click &quot;Verify API key&quot; to test.</p>}
            {keyVerified === true && <p className="mt-1 text-sm text-emerald-400">Key accepted by API.</p>}
            {keyVerified === false && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm space-y-2">
                <p className="font-medium">Key rejected or request failed. Check:</p>
                <ul className="list-disc list-inside ml-2 space-y-1 text-slate-300">
                  <li>Is the EduSpace API running at the base URL? (e.g. <code className="bg-slate-800 px-1 rounded">http://localhost:4000</code>)</li>
                  <li>Is the key from EduSpace → API Integration and not revoked?</li>
                  <li>This demo runs on port 3002; the API on 4000 is a different origin. The EduSpace backend must send CORS headers allowing <code className="bg-slate-800 px-1 rounded">http://localhost:3002</code>.</li>
                </ul>
                <p className="text-slate-400">See the Response section below for the exact status and error from the API.</p>
              </div>
            )}
          </div>
        </div>

        {/* Main tabs: Documents | Exam | Lesson */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-slate-700 pb-2">
            <button
              type="button"
              onClick={() => setMainTab('documents')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${mainTab === 'documents' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              Documents (upload & list)
            </button>
            <button
              type="button"
              onClick={() => setMainTab('exam')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${mainTab === 'exam' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              POST /exams/generate
            </button>
            <button
              type="button"
              onClick={() => setMainTab('lesson')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${mainTab === 'lesson' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              POST /lessons/generate
            </button>
          </div>
        </div>

        {/* Documents tab */}
        {mainTab === 'documents' && (
          <div className="space-y-8">
            <p className="text-slate-400">Upload PDF, text, or markdown; the API stores the file and runs RAG processing in the background. Use the returned <code className="bg-slate-800 px-1 rounded">document_id</code> in exam and lesson generation. Max 50MB.</p>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">POST /documents/upload</h3>
              <p className="text-sm text-slate-400 mb-4">Send a file as multipart/form-data (field name: <code className="bg-slate-800 px-1 rounded">file</code>). Response includes <code className="bg-slate-800 px-1 rounded">document_id</code> and <code className="bg-slate-800 px-1 rounded">processing_status</code>.</p>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:font-medium"
                />
                <button
                  type="button"
                  onClick={runDocumentsUpload}
                  disabled={loading || !uploadFile}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">GET /documents</h3>
              <p className="text-sm text-slate-400 mb-4">List your documents (paginated). Query: <code className="bg-slate-800 px-1 rounded">page</code>, <code className="bg-slate-800 px-1 rounded">per_page</code>. Use each item’s <code className="bg-slate-800 px-1 rounded">id</code> as <code className="bg-slate-800 px-1 rounded">document_id</code> in exams/lessons.</p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-slate-400">
                  Page <input type="number" min={1} value={listPage} onChange={(e) => setListPage(Number(e.target.value))} className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100" />
                </label>
                <label className="flex items-center gap-2 text-slate-400">
                  Per page <input type="number" min={1} max={100} value={listPerPage} onChange={(e) => setListPerPage(Number(e.target.value))} className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100" />
                </label>
                <button
                  type="button"
                  onClick={runDocumentsList}
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading…' : 'List documents'}
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">GET /documents/:id</h3>
              <p className="text-sm text-slate-400 mb-4">Get one document. Check <code className="bg-slate-800 px-1 rounded">processing_status</code> (e.g. completed) before using the document in exam/lesson generation.</p>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Document UUID"
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={runDocumentsGet}
                  disabled={loading || !documentId.trim()}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading…' : 'Get document'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exam tab */}
        {mainTab === 'exam' && (
          <>
            <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 mb-6">
              <h3 className="text-slate-200 font-semibold mb-2">Generate new exam</h3>
              <p className="text-sm text-slate-400">
                Use <code className="bg-slate-800 px-1 rounded">document_id</code> or <code className="bg-slate-800 px-1 rounded">document_ids</code> (RAG) or <code className="bg-slate-800 px-1 rounded">document_text</code> (raw text, 50–100,000 chars). Document must be processed. Optional: title, subject, grade_level, topics, language (en, es, fr, de, pt, it, zh, ja, ko, ar, hi, ru, az, tr), custom_instructions, settings (question_count 1–50, difficulty_distribution, question_types, include_explanations, include_hints).
              </p>
            </div>
            <div className="mb-4 flex gap-2">
              <button type="button" onClick={() => setExamPayload(JSON.stringify(EXAM_WITH_DOCUMENT_ID, null, 2))} className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Use document_id (RAG)</button>
              <button type="button" onClick={() => setExamPayload(JSON.stringify(EXAM_WITH_DOCUMENT_TEXT, null, 2))} className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Use document_text (raw)</button>
            </div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Request body (JSON)</label>
            <textarea
              value={examPayload}
              onChange={(e) => setExamPayload(e.target.value)}
              rows={18}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-6 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={runExamOrLesson}
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
            >
              {loading ? 'Calling API…' : 'Generate exam'}
            </button>
          </>
        )}

        {/* Lesson tab */}
        {mainTab === 'lesson' && (
          <>
            <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 mb-6">
              <h3 className="text-slate-200 font-semibold mb-2">Generate new lesson</h3>
              <p className="text-sm text-slate-400 mb-2">
                Use a <code className="bg-slate-800 px-1 rounded">document_id</code> (from upload or GET /documents) and a <code className="bg-slate-800 px-1 rounded">topic</code>; choose content via <code className="bg-slate-800 px-1 rounded">include</code>. Required: document_id (UUID), topic.
              </p>
              <p className="text-sm text-slate-400">
                Optional: <code className="bg-slate-800 px-1 rounded">language</code> (e.g. English, Azərbaycan, Русский, Türkçe, Deutsch, Français, Español, العربية). <code className="bg-slate-800 px-1 rounded">include</code>: &quot;text&quot; (default), &quot;text_and_images&quot;, &quot;text_and_audio&quot;, &quot;full&quot; (images + audio). <code className="bg-slate-800 px-1 rounded">options</code>: includeImages, includeAudio (override include if set), centerText (default: true).
              </p>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setLessonPayload(JSON.stringify(LESSON_EXAMPLE_TEXT, null, 2))} className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Text only</button>
              <button type="button" onClick={() => setLessonPayload(JSON.stringify(LESSON_EXAMPLE_IMAGES, null, 2))} className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">With images</button>
              <button type="button" onClick={() => setLessonPayload(JSON.stringify(LESSON_EXAMPLE_AUDIO, null, 2))} className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">With audio</button>
              <button type="button" onClick={() => setLessonPayload(JSON.stringify(LESSON_EXAMPLE_FULL, null, 2))} className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Full (images + audio)</button>
            </div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Request body (JSON)</label>
            <textarea
              value={lessonPayload}
              onChange={(e) => setLessonPayload(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-6 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={runExamOrLesson}
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
            >
              {loading ? 'Calling API…' : 'Generate lesson'}
            </button>
          </>
        )}

        {/* Shared response area */}
        {result && (
          <div className="mt-10 p-6 rounded-2xl border bg-slate-900/80 border-slate-700">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Response</h2>
            {result.status === 500 && typeof result.data === 'object' && result.data !== null && JSON.stringify(result.data).includes('Authentication failed') && (
              <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm space-y-2">
                <p><strong>Authentication failed</strong> — The EduSpace API rejected the request.</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Use <strong>Verify API key</strong> above: if it succeeds, the key is valid and the problem is likely that <em>multipart upload</em> on your EduSpace server is not using the same auth — ensure <code className="bg-slate-800 px-1 rounded">/documents/upload</code> reads the <code className="bg-slate-800 px-1 rounded">Authorization</code> header.</li>
                  <li>If verify also fails: paste only the key (e.g. <code className="bg-slate-800 px-1 rounded">edsk_...</code>), no extra spaces, and copy it again from EduSpace → API Integration.</li>
                </ul>
              </div>
            )}
            {result.error ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">{result.error}</div>
            ) : (
              <>
                {result.status != null && (
                  <div className="mb-4">
                    <span className="text-slate-400">Status: </span>
                    <span className={result.status >= 200 && result.status < 300 ? 'text-emerald-400' : 'text-amber-400'}>{result.status}</span>
                  </div>
                )}
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-sm overflow-auto max-h-96 font-mono">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}

        <div className="mt-10 p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-3">Authentication</h3>
          <p className="text-slate-400 leading-relaxed">
            Every request must include <code className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-300">Authorization: Bearer YOUR_API_KEY</code>. Keep your key secret and do not commit it to code.
          </p>
        </div>
      </main>
    </div>
  );
}
