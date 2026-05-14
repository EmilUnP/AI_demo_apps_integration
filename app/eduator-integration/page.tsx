'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const DEFAULT_BASE_URL =
  typeof process.env.NEXT_PUBLIC_EDUATOR_API_BASE_URL === 'string' &&
  process.env.NEXT_PUBLIC_EDUATOR_API_BASE_URL.trim()
    ? process.env.NEXT_PUBLIC_EDUATOR_API_BASE_URL.trim()
    : 'http://127.0.0.1:4000/v1';

const DEFAULT_ACCESS_TOKEN =
  typeof process.env.NEXT_PUBLIC_EDUATOR_ACCESS_TOKEN === 'string'
    ? process.env.NEXT_PUBLIC_EDUATOR_ACCESS_TOKEN.trim()
    : '';

const DEFAULT_LOGIN_EMAIL =
  typeof process.env.NEXT_PUBLIC_EDUATOR_LOGIN_EMAIL === 'string'
    ? process.env.NEXT_PUBLIC_EDUATOR_LOGIN_EMAIL.trim()
    : '';

/** Base64 in JSON is heavy; cap keeps the demo page responsive. Raise if your backend allows larger bodies. */
const DOCUMENT_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

const DOCUMENT_CREATE_EXAMPLE = {
  title: 'Math Chapter 1',
  fileName: 'chapter-1.pdf',
  fileType: 'application/pdf',
  fileSize: 245760,
  contentBase64: '<BASE64_OF_FILE_BYTES>',
};

const guessMimeFromFileName = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
};

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error(reader.error?.message ?? 'Read failed'));
    reader.readAsDataURL(file);
  });

const EXAM_WITH_DOCUMENT_ID = {
  documentId: 'uuid-from-documents',
  title: 'Quiz 1',
  subject: 'Math',
  gradeLevel: '10',
  language: 'en',
  questionCount: 10,
  questionTypes: ['multiple_choice', 'true_false'],
  difficultyDistribution: { easy: 3, medium: 5, hard: 2 },
};

const EXAM_WITH_DOCUMENT_TEXT = {
  documentText:
    'Your lesson or chapter text here. Add enough content for the model to generate meaningful questions.',
  title: 'Quiz 1',
  subject: 'Math',
  gradeLevel: '10',
  language: 'en',
  questionCount: 10,
  questionTypes: ['multiple_choice', 'true_false'],
  difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
};

const LESSON_EXAMPLE_FULL = {
  documentId: 'uuid-primary-document',
  documentIds: ['uuid-primary-document', 'uuid-secondary-document'],
  topic: 'Introduction to Fractions',
  language: 'en',
  gradeLevel: 'grade_9',
  objectives: 'Define numerator and denominator\nCompare fractions\nAdd simple fractions',
  corePrompt: 'Keep explanations practical with real-life examples.',
  options: {
    includeImages: true,
    includeAudio: true,
    includeTables: true,
    includeFigures: true,
    includeCharts: false,
    contentLength: 'full',
  },
};

const EDUCATION_PLAN_EXAMPLE = {
  documentId: 'uuid-from-documents',
  name: 'Grade 10 Math Plan',
  language: 'az',
  periodMonths: 3,
  sessionsPerWeek: 3,
  hoursPerSession: 1,
};

/** REST writes use snake_case (per API). */
const EDUCATION_PLAN_REST_POST_EXAMPLE = {
  name: 'Semester plan',
  description: null,
  period_months: 3,
  sessions_per_week: 3,
  hours_per_session: 1,
  audience: 'Grade 10',
  document_ids: ['DOCUMENT_UUID'],
  content: [],
};

const EDUCATION_PLAN_PATCH_EXAMPLE = {
  name: 'Renamed plan',
  audience: 'Grade 11',
};

/** Saved exams: camelCase on POST (per API). */
const EXAM_SAVE_POST_EXAMPLE = {
  title: 'Saved quiz',
  language: 'en',
  durationMinutes: 45,
  isPublished: false,
  questions: [],
};

const CHAT_CONVERSATION_POST_EXAMPLE = {
  title: 'Lesson prep',
  documentIds: ['DOCUMENT_UUID'],
};

const CHAT_PATCH_EXAMPLE = {
  title: 'Renamed thread',
  documentIds: ['DOCUMENT_UUID'],
};

const CHAT_MESSAGE_POST_EXAMPLE = {
  message: 'Summarize the key ideas for my next class.',
  documentIds: ['DOCUMENT_UUID'],
  shortAnswer: false,
};

type MainTab = 'documents' | 'exam' | 'lesson' | 'education' | 'chat';

export default function EduatorIntegrationPage() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [accessToken, setAccessToken] = useState(DEFAULT_ACCESS_TOKEN);
  const [loginEmail, setLoginEmail] = useState(DEFAULT_LOGIN_EMAIL);
  const [loginPassword, setLoginPassword] = useState('');
  const [mainTab, setMainTab] = useState<MainTab>('documents');
  const [documentCreatePayload, setDocumentCreatePayload] = useState(
    JSON.stringify(DOCUMENT_CREATE_EXAMPLE, null, 2),
  );
  const [examPayload, setExamPayload] = useState(JSON.stringify(EXAM_WITH_DOCUMENT_ID, null, 2));
  const [lessonPayload, setLessonPayload] = useState(JSON.stringify(LESSON_EXAMPLE_FULL, null, 2));
  const [educationPayload, setEducationPayload] = useState(
    JSON.stringify(EDUCATION_PLAN_EXAMPLE, null, 2),
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status?: number; data?: unknown; error?: string } | null>(null);
  const [tokenVerified, setTokenVerified] = useState<boolean | null>(null);

  const [listPage, setListPage] = useState(1);
  const [listPerPage, setListPerPage] = useState(20);
  const [listSearch, setListSearch] = useState('');

  const [documentId, setDocumentId] = useState('');

  const [lessonsPage, setLessonsPage] = useState(1);
  const [lessonsPerPage, setLessonsPerPage] = useState(20);
  const [lessonsSearch, setLessonsSearch] = useState('');

  const [lessonId, setLessonId] = useState('');

  const [educationPlansSearch, setEducationPlansSearch] = useState('');
  const [educationPlanRestId, setEducationPlanRestId] = useState('');
  const [educationPlanCreatePayload, setEducationPlanCreatePayload] = useState(
    JSON.stringify(EDUCATION_PLAN_REST_POST_EXAMPLE, null, 2),
  );
  const [educationPlanPatchPayload, setEducationPlanPatchPayload] = useState(
    JSON.stringify(EDUCATION_PLAN_PATCH_EXAMPLE, null, 2),
  );

  const [examsPage, setExamsPage] = useState(1);
  const [examsPerPage, setExamsPerPage] = useState(10);
  const [examsSearch, setExamsSearch] = useState('');
  const [examSavedId, setExamSavedId] = useState('');
  const [examSavePayload, setExamSavePayload] = useState(JSON.stringify(EXAM_SAVE_POST_EXAMPLE, null, 2));

  const [chatConversationId, setChatConversationId] = useState('');
  const [chatCreatePayload, setChatCreatePayload] = useState(JSON.stringify(CHAT_CONVERSATION_POST_EXAMPLE, null, 2));
  const [chatPatchPayload, setChatPatchPayload] = useState(JSON.stringify(CHAT_PATCH_EXAMPLE, null, 2));
  const [chatMessagePayload, setChatMessagePayload] = useState(JSON.stringify(CHAT_MESSAGE_POST_EXAMPLE, null, 2));

  const docsBaseRef = useRef<string>('');
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const [documentPackStatus, setDocumentPackStatus] = useState<string | null>(null);
  const [documentPacking, setDocumentPacking] = useState(false);

  const normalizeToken = (token: string) => {
    const trimmed = token.trim();
    return trimmed.startsWith('Bearer ') ? trimmed.slice(7).trim() : trimmed;
  };

  const getAuthHeaders = (omitContentType = false): Record<string, string> => {
    const token = normalizeToken(accessToken);
    const h: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!omitContentType) h['Content-Type'] = 'application/json';
    return h;
  };

  const apiRoot = () => baseUrl.replace(/\/$/, '');

  const runLogin = async () => {
    if (!baseUrl?.trim()) {
      setResult({ error: 'Enter base URL first.' });
      return;
    }
    if (!loginEmail.trim() || !loginPassword) {
      setResult({ error: 'Enter email and password.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}/auth/login`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();
      const token =
        isJson && data && typeof data === 'object'
          ? (data as { tokens?: { accessToken?: string }; accessToken?: string }).tokens?.accessToken ??
            (data as { accessToken?: string }).accessToken
          : undefined;
      if (response.ok && typeof token === 'string' && token) {
        setAccessToken(token);
        setTokenVerified(true);
        setResult({
          status: response.status,
          data: { ...((typeof data === 'object' && data) || {}), tokens: { accessToken: '***saved***' } },
        });
      } else {
        setTokenVerified(false);
        setResult({ status: response.status, data });
      }
    } catch (err: unknown) {
      setTokenVerified(false);
      setResult({ error: err instanceof Error ? err.message : 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  const verifyAccessToken = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setTokenVerified(false);
      setResult({ error: 'Enter base URL and access token first.' });
      return;
    }
    setTokenVerified(null);
    setLoading(true);
    setResult(null);
    const q = new URLSearchParams({ page: '1', perPage: '1' });
    const url = `${apiRoot()}/documents?${q.toString()}`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const ok = response.status >= 200 && response.status < 300;
      setTokenVerified(ok);
      const raw = await response.text();
      if (ok) {
        setResult({ status: response.status, data: { ok: true } });
        return;
      }
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      let data: unknown = raw.length > 1200 ? `${raw.slice(0, 1200)}…` : raw;
      if (isJson) {
        try {
          data = JSON.parse(raw);
        } catch {
          /* keep truncated text */
        }
      }
      setResult({ status: response.status, data, error: undefined });
    } catch (err: unknown) {
      setTokenVerified(false);
      const msg = err instanceof Error ? err.message : 'Request failed';
      const isNetwork = /failed|network|cors|fetch/i.test(msg);
      setResult({
        error: isNetwork
          ? 'Network error — is the API running? For browser calls, the backend must allow CORS for this origin.'
          : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentFileSelected = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) {
      setDocumentPackStatus(null);
      setResult({
        error: `File is larger than ${DOCUMENT_UPLOAD_MAX_BYTES / (1024 * 1024)} MB. Embed a smaller file here, or call the API from a script/CLI.`,
      });
      if (documentFileInputRef.current) documentFileInputRef.current.value = '';
      return;
    }
    setDocumentPacking(true);
    setDocumentPackStatus('Encoding file…');
    setResult(null);
    try {
      const base64 = await readFileAsBase64(file);
      const titleFromName = file.name.replace(/\.[^/.]+$/, '') || file.name;
      let existing: Record<string, unknown> = {};
      try {
        existing = JSON.parse(documentCreatePayload || '{}') as Record<string, unknown>;
      } catch {
        existing = {};
      }
      const next: Record<string, unknown> = {
        ...existing,
        title:
          typeof existing.title === 'string' && existing.title.trim() && existing.title !== 'Math Chapter 1'
            ? existing.title
            : titleFromName,
        fileName: file.name,
        fileType: file.type || guessMimeFromFileName(file.name),
        fileSize: file.size,
        contentBase64: base64,
      };
      delete next.localPath;
      setDocumentCreatePayload(JSON.stringify(next, null, 2));
      setDocumentPackStatus(`Included in JSON: ${file.name} (${(file.size / 1024).toFixed(1)} KB).`);
    } catch (err: unknown) {
      setDocumentPackStatus(null);
      setResult({ error: err instanceof Error ? err.message : 'Could not read file' });
    } finally {
      setDocumentPacking(false);
      if (documentFileInputRef.current) documentFileInputRef.current.value = '';
    }
  };

  const runDocumentCreate = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}/documents`;
    try {
      const body = JSON.parse(documentCreatePayload || '{}');
      const hasUpload =
        typeof body.contentBase64 === 'string' &&
        body.contentBase64.length > 0 &&
        body.contentBase64 !== '<BASE64_OF_FILE_BYTES>';
      const hasLocal =
        typeof body.localPath === 'string' && body.localPath.trim().length > 0;
      if (!hasUpload && !hasLocal) {
        setResult({
          error: 'Add contentBase64 (use “Choose file” below) or localPath for a file that already exists on the server.',
        });
        setLoading(false);
        return;
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = response.ok ? await response.json().catch(() => ({})) : { error: await response.text() };
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      if (err instanceof SyntaxError) setResult({ error: 'Invalid JSON in document body' });
      else setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runDocumentsList = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const q = new URLSearchParams({
      page: String(listPage),
      perPage: String(listPerPage),
    });
    if (listSearch.trim()) q.set('search', listSearch.trim());
    const url = `${apiRoot()}/documents?${q.toString()}`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const data = response.ok ? await response.json().catch(() => ({})) : { error: await response.text() };
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runDocumentsGet = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    if (!documentId?.trim()) {
      setResult({ error: 'Enter a document ID (UUID).' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}/documents/${encodeURIComponent(documentId.trim())}`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const data = response.ok ? await response.json().catch(() => ({})) : { error: await response.text() };
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runDocumentsGetFile = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    if (!documentId?.trim()) {
      setResult({ error: 'Enter a document ID (UUID).' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}/documents/${encodeURIComponent(documentId.trim())}/file`;
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${normalizeToken(accessToken)}` } });
      const ct = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        setResult({ status: response.status, data: { error: await response.text() } });
        return;
      }
      const blob = await response.blob();
      if (blob.size && (ct.startsWith('text/') || ct.includes('json'))) {
        const text = await blob.text();
        setResult({ status: response.status, data: { contentType: ct, size: blob.size, preview: text.slice(0, 4000) } });
      } else {
        const objectUrl = URL.createObjectURL(blob);
        if (docsBaseRef.current) URL.revokeObjectURL(docsBaseRef.current);
        docsBaseRef.current = objectUrl;
        setResult({
          status: response.status,
          data: {
            contentType: ct,
            size: blob.size,
            downloadUrl: objectUrl,
            hint: 'Open downloadUrl in a new tab or use it as <a href> to download the stream.',
          },
        });
      }
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runLessonsList = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const q = new URLSearchParams({
      page: String(lessonsPage),
      perPage: String(lessonsPerPage),
    });
    if (lessonsSearch.trim()) q.set('search', lessonsSearch.trim());
    const url = `${apiRoot()}/lessons?${q.toString()}`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const data = isJson ? await response.json().catch(() => ({})) : await response.text();
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runLessonGet = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    if (!lessonId?.trim()) {
      setResult({ error: 'Enter a lesson ID (UUID).' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}/lessons/${encodeURIComponent(lessonId.trim())}`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const data = isJson ? await response.json().catch(() => ({})) : await response.text();
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runEducationPlansList = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const q = new URLSearchParams();
    if (educationPlansSearch.trim()) q.set('search', educationPlansSearch.trim());
    const qs = q.toString();
    const url = `${apiRoot()}/education-plans${qs ? `?${qs}` : ''}`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const data = isJson ? await response.json().catch(() => ({})) : await response.text();
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runExamsList = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const q = new URLSearchParams({
      page: String(examsPage),
      perPage: String(examsPerPage),
    });
    if (examsSearch.trim()) q.set('search', examsSearch.trim());
    const url = `${apiRoot()}/exams?${q.toString()}`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const ct = response.headers.get('content-type');
      const data = ct?.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runExamsStats = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}/exams/stats`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const ct = response.headers.get('content-type');
      const data = ct?.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runExamGet = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    if (!examSavedId?.trim()) {
      setResult({ error: 'Enter an exam ID (UUID).' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}/exams/${encodeURIComponent(examSavedId.trim())}`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const ct = response.headers.get('content-type');
      const data = ct?.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runChatConversationsList = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}/ai/chat/conversations`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const ct = response.headers.get('content-type');
      const data = ct?.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runChatConversationGet = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    if (!chatConversationId?.trim()) {
      setResult({ error: 'Enter a conversation ID (UUID).' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}/ai/chat/conversations/${encodeURIComponent(chatConversationId.trim())}`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const ct = response.headers.get('content-type');
      const data = ct?.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runJsonRequest = async (method: 'POST' | 'PATCH', path: string, payload: string) => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const body = JSON.parse(payload || '{}');
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const ct = response.headers.get('content-type');
      const data = ct?.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();
      setResult({ status: response.status, data: response.ok ? data : { error: data } });
    } catch (e: unknown) {
      if (e instanceof SyntaxError) setResult({ error: 'Invalid JSON in request body' });
      else setResult({ error: e instanceof Error ? e.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runDeleteRequest = async (path: string) => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(true),
      });
      const ct = response.headers.get('content-type');
      const data = ct?.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();
      setResult({ status: response.status, data: response.ok ? data : { error: data } });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runDocumentDelete = async () => {
    if (!documentId?.trim()) {
      setResult({ error: 'Enter a document ID (UUID) above.' });
      return;
    }
    await runDeleteRequest(`/documents/${encodeURIComponent(documentId.trim())}`);
  };

  const runLessonDelete = async () => {
    if (!lessonId?.trim()) {
      setResult({ error: 'Enter a lesson ID (UUID) above.' });
      return;
    }
    await runDeleteRequest(`/lessons/${encodeURIComponent(lessonId.trim())}`);
  };

  const runGeminiKeysGet = async () => {
    if (!baseUrl?.trim() || !accessToken?.trim()) {
      setResult({ error: 'Base URL and access token are required.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const url = `${apiRoot()}/users/me/ai-keys/gemini`;
    try {
      const response = await fetch(url, { headers: getAuthHeaders() });
      const data = response.ok ? await response.json().catch(() => ({})) : { error: await response.text() };
      setResult({ status: response.status, data });
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const runAiPost = async (path: string, payload: string) => {
    if (!baseUrl?.trim()) {
      setResult({ error: 'Please enter API base URL' });
      return;
    }
    if (!accessToken?.trim()) {
      setResult({ error: 'JWT access token is required (login or paste Bearer token).' });
      return;
    }
    setLoading(true);
    setResult(null);
    const fullUrl = `${apiRoot()}${path}`;
    try {
      const body = JSON.parse(payload || '{}');
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const contentType = response.headers.get('content-type');
      let data: unknown;
      if (contentType?.includes('application/json')) {
        data = await response.json().catch(() => ({}));
      } else {
        data = await response.text();
      }
      setResult({
        status: response.status,
        data: response.ok ? data : { error: data },
      });
    } catch (e) {
      if (e instanceof SyntaxError) setResult({ error: 'Invalid JSON in request body' });
      else
        setResult({
          error: e instanceof Error ? e.message : 'Request failed (check CORS if calling from another origin)',
        });
    } finally {
      setLoading(false);
    }
  };

  const docsUiUrl = () => {
    try {
      const u = new URL(apiRoot());
      return `${u.origin}/v1/docs`;
    } catch {
      return `${apiRoot()}/docs`;
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
              <Link href="/" className="text-slate-300 hover:text-indigo-300 transition-colors">
                Ana səhifə
              </Link>
              <Link href="/assistants" className="text-slate-300 hover:text-indigo-300 transition-colors">
                Köməkçilər
              </Link>
              <Link href="/test-api" className="text-slate-300 hover:text-indigo-300 transition-colors">
                Test API
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-100 mb-2">Eduator API Integration</h1>
          <p className="text-slate-400">
            JWT <code className="bg-slate-800 px-1 rounded">Authorization: Bearer</code>, base{' '}
            <code className="bg-slate-800 px-1 rounded">/v1</code>. AI routes use <strong className="text-slate-300">camelCase</strong>; REST education
            plan writes use <strong className="text-slate-300">snake_case</strong>. Languages: en, az, tr, ru. Open{' '}
            <a
              href={docsUiUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              /v1/docs
            </a>
            .
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">API base URL</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="http://127.0.0.1:4000/v1"
            />
            <p className="mt-1 text-sm text-slate-500">
              Override with <code className="bg-slate-800 px-1 rounded">NEXT_PUBLIC_EDUATOR_API_BASE_URL</code> in{' '}
              <code className="bg-slate-800 px-1 rounded">.env.local</code>.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700 space-y-4">
            <h3 className="text-slate-200 font-semibold">Login (JWT)</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                  placeholder="admin@example.com"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={runLogin}
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'POST /auth/login'}
            </button>
            <p className="text-xs text-slate-500">
              Password is not read from env (avoid exposing secrets in the browser bundle). Optionally set{' '}
              <code className="bg-slate-800 px-1 rounded">NEXT_PUBLIC_EDUATOR_LOGIN_EMAIL</code> to pre-fill email only.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Access token (JWT) <span className="text-amber-400">(required for protected routes)</span>
            </label>
            <div className="flex gap-3 items-center flex-wrap">
              <input
                type="password"
                value={accessToken}
                onChange={(e) => {
                  setAccessToken(e.target.value);
                  setTokenVerified(null);
                }}
                className="flex-1 min-w-[200px] px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Paste access token (or login above)"
              />
              <button
                type="button"
                onClick={verifyAccessToken}
                disabled={loading || !accessToken.trim()}
                className="px-4 py-3 bg-slate-700 text-slate-200 font-medium rounded-xl hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600"
              >
                {loading ? 'Checking…' : 'Verify token'}
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Verify calls GET <code className="bg-slate-800 px-1 rounded">/documents?page=1&amp;perPage=1</code> and only shows{' '}
              <code className="bg-slate-800 px-1 rounded">{'{ "ok": true }'}</code> when it succeeds. Pre-fill token:{' '}
              <code className="bg-slate-800 px-1 rounded">NEXT_PUBLIC_EDUATOR_ACCESS_TOKEN</code> in{' '}
              <code className="bg-slate-800 px-1 rounded">.env.local</code>.
            </p>
            {DEFAULT_ACCESS_TOKEN && (
              <p className="mt-1 text-sm text-indigo-400">Token from env was pre-filled. Use Verify or call an endpoint.</p>
            )}
            {tokenVerified === true && <p className="mt-1 text-sm text-emerald-400">Token accepted.</p>}
            {tokenVerified === false && (
              <p className="mt-1 text-sm text-amber-300">Token rejected or request failed — see Response below.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runGeminiKeysGet}
              disabled={loading || !accessToken.trim()}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700 disabled:opacity-50 text-sm"
            >
              GET /users/me/ai-keys/gemini
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-2">
            {(
              [
                ['documents', 'Documents'],
                ['exam', 'Exams'],
                ['lesson', 'Lessons'],
                ['education', 'Education plans'],
                ['chat', 'AI chat'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMainTab(id)}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  mainTab === id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mainTab === 'documents' && (
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">POST /documents</h3>
              <p className="text-sm text-slate-400 mb-4">
                JSON body: required <code className="bg-slate-800 px-1 rounded">title</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">fileName</code>, <code className="bg-slate-800 px-1 rounded">fileType</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">fileSize</code>. Send file bytes as{' '}
                <code className="bg-slate-800 px-1 rounded">contentBase64</code> (same as the main web app) or, only when the file already exists on the
                server, <code className="bg-slate-800 px-1 rounded">localPath</code>.
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <input
                  ref={documentFileInputRef}
                  type="file"
                  className="block text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  disabled={documentPacking || loading}
                  onChange={(e) => void handleDocumentFileSelected(e.target.files)}
                />
                {documentPacking && <span className="text-sm text-slate-400">Encoding…</span>}
              </div>
              {documentPackStatus && <p className="text-sm text-emerald-400/90 mb-3">{documentPackStatus}</p>}
              <textarea
                value={documentCreatePayload}
                onChange={(e) => {
                  setDocumentCreatePayload(e.target.value);
                  setDocumentPackStatus(null);
                }}
                rows={8}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-2"
              />
              <p className="text-xs text-slate-500 mb-4">
                After choosing a file, the textarea includes a long <code className="bg-slate-800 px-1 rounded">contentBase64</code> string. Demo limit:{' '}
                {DOCUMENT_UPLOAD_MAX_BYTES / (1024 * 1024)} MB file size.
              </p>
              <button
                type="button"
                onClick={runDocumentCreate}
                disabled={loading || documentPacking}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Create document'}
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">GET /documents</h3>
              <p className="text-sm text-slate-400 mb-4">
                Returns <code className="bg-slate-800 px-1 rounded">{'{ "items": [...] }'}</code>. Typical item fields: <code className="bg-slate-800 px-1 rounded">id</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">title</code>, <code className="bg-slate-800 px-1 rounded">file_name</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">status</code> (pending / processing / ready / failed), <code className="bg-slate-800 px-1 rounded">content_language</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">chunk_count</code>, <code className="bg-slate-800 px-1 rounded">quality_status</code>. Query:{' '}
                <code className="bg-slate-800 px-1 rounded">page</code>, <code className="bg-slate-800 px-1 rounded">perPage</code>, optional{' '}
                <code className="bg-slate-800 px-1 rounded">search</code>.
              </p>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <label className="flex items-center gap-2 text-slate-400">
                  Page{' '}
                  <input
                    type="number"
                    min={1}
                    value={listPage}
                    onChange={(e) => setListPage(Number(e.target.value))}
                    className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100"
                  />
                </label>
                <label className="flex items-center gap-2 text-slate-400">
                  perPage{' '}
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={listPerPage}
                    onChange={(e) => setListPerPage(Number(e.target.value))}
                    className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100"
                  />
                </label>
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="search (optional)"
                  className="flex-1 min-w-[160px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                />
                <button
                  type="button"
                  onClick={runDocumentsList}
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'List documents'}
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">GET /documents/:id · GET /documents/:id/file · DELETE /documents/:id</h3>
              <p className="text-sm text-slate-400 mb-4">
                GET JSON returns <code className="bg-slate-800 px-1 rounded">{'{ "document": { ... } }'}</code> for one owned document. GET file returns raw
                bytes (not JSON). DELETE returns <code className="bg-slate-800 px-1 rounded">{'{ "success": true }'}</code> and removes stored file.
              </p>
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
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  Get JSON
                </button>
                <button
                  type="button"
                  onClick={runDocumentsGetFile}
                  disabled={loading || !documentId.trim()}
                  className="px-6 py-2.5 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 disabled:opacity-50 border border-slate-600"
                >
                  Get file
                </button>
                <button
                  type="button"
                  onClick={runDocumentDelete}
                  disabled={loading || !documentId.trim()}
                  className="px-6 py-2.5 bg-red-900/50 text-red-200 font-medium rounded-xl hover:bg-red-900/70 disabled:opacity-50 border border-red-800/50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {mainTab === 'exam' && (
          <>
            <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 mb-6">
              <h3 className="text-slate-200 font-semibold mb-2">POST /ai/exams/generate</h3>
              <p className="text-sm text-slate-400">
                Body uses camelCase: <code className="bg-slate-800 px-1 rounded">documentId</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">documentIds</code>, or <code className="bg-slate-800 px-1 rounded">documentText</code>;{' '}
                <code className="bg-slate-800 px-1 rounded">title</code>, <code className="bg-slate-800 px-1 rounded">subject</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">gradeLevel</code>, <code className="bg-slate-800 px-1 rounded">language</code>;{' '}
                <code className="bg-slate-800 px-1 rounded">questionCount</code> (1–50);{' '}
                <code className="bg-slate-800 px-1 rounded">questionTypes</code> (e.g. multiple_choice, true_false, short_answer, fill_blank, multiple_select);{' '}
                <code className="bg-slate-800 px-1 rounded">difficultyDistribution</code> with easy / medium / hard counts.
              </p>
            </div>
            <div className="mb-4 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setExamPayload(JSON.stringify(EXAM_WITH_DOCUMENT_ID, null, 2))}
                className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
              >
                documentId
              </button>
              <button
                type="button"
                onClick={() => setExamPayload(JSON.stringify(EXAM_WITH_DOCUMENT_TEXT, null, 2))}
                className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
              >
                documentText
              </button>
            </div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Request body (JSON)</label>
            <textarea
              value={examPayload}
              onChange={(e) => setExamPayload(e.target.value)}
              rows={18}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-6 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => runAiPost('/ai/exams/generate', examPayload)}
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-500/25"
            >
              {loading ? 'Calling API…' : 'Generate exam'}
            </button>

            <div className="mt-10 p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">Saved exams — GET /exams · GET /exams/stats</h3>
              <p className="text-sm text-slate-400 mb-4">
                Persisted exams (camelCase on POST). List uses <code className="bg-slate-800 px-1 rounded">page</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">perPage</code>, <code className="bg-slate-800 px-1 rounded">search</code>.
              </p>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <label className="flex items-center gap-2 text-slate-400 text-sm">
                  Page
                  <input
                    type="number"
                    min={1}
                    value={examsPage}
                    onChange={(e) => setExamsPage(Number(e.target.value) || 1)}
                    className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100"
                  />
                </label>
                <label className="flex items-center gap-2 text-slate-400 text-sm">
                  perPage
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={examsPerPage}
                    onChange={(e) => setExamsPerPage(Number(e.target.value) || 10)}
                    className="w-24 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100"
                  />
                </label>
                <input
                  type="text"
                  value={examsSearch}
                  onChange={(e) => setExamsSearch(e.target.value)}
                  placeholder="search"
                  className="flex-1 min-w-[140px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                />
                <button
                  type="button"
                  onClick={runExamsList}
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  List exams
                </button>
                <button
                  type="button"
                  onClick={runExamsStats}
                  disabled={loading}
                  className="px-6 py-2.5 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 disabled:opacity-50 border border-slate-600"
                >
                  Stats
                </button>
              </div>
            </div>

            <div className="mt-6 p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">GET /exams/:id · POST /exams · DELETE /exams/:id</h3>
              <p className="text-sm text-slate-400 mb-4">Use the exam UUID from the list or generator response.</p>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <input
                  type="text"
                  value={examSavedId}
                  onChange={(e) => setExamSavedId(e.target.value)}
                  placeholder="Exam UUID"
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={runExamGet}
                  disabled={loading || !examSavedId.trim()}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  Get exam
                </button>
                <button
                  type="button"
                  onClick={() => runDeleteRequest(`/exams/${encodeURIComponent(examSavedId.trim())}`)}
                  disabled={loading || !examSavedId.trim()}
                  className="px-6 py-2.5 bg-red-900/50 text-red-200 font-medium rounded-xl hover:bg-red-900/70 disabled:opacity-50 border border-red-800/50"
                >
                  Delete
                </button>
              </div>
              <label className="block text-sm font-medium text-slate-300 mb-2">POST /exams body (camelCase)</label>
              <textarea
                value={examSavePayload}
                onChange={(e) => setExamSavePayload(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-3"
              />
              <button
                type="button"
                onClick={() => runJsonRequest('POST', '/exams', examSavePayload)}
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                Create saved exam
              </button>
            </div>
          </>
        )}

        {mainTab === 'lesson' && (
          <>
            <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 mb-6">
              <h3 className="text-slate-200 font-semibold mb-2">POST /ai/lessons/generate</h3>
              <p className="text-sm text-slate-400 mb-2">
                Required: <code className="bg-slate-800 px-1 rounded">topic</code>. Optional:{' '}
                <code className="bg-slate-800 px-1 rounded">documentId</code>, <code className="bg-slate-800 px-1 rounded">documentIds</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">language</code> (en, az, tr, ru), <code className="bg-slate-800 px-1 rounded">gradeLevel</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">objectives</code>, <code className="bg-slate-800 px-1 rounded">corePrompt</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">options</code> (includeImages, includeAudio, contentLength, …).{' '}
                <code className="bg-slate-800 px-1 rounded">audio_url</code> may be null until TTS finishes — poll GET{' '}
                <code className="bg-slate-800 px-1 rounded">/lessons/:id</code>.
              </p>
            </div>
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setLessonPayload(JSON.stringify(LESSON_EXAMPLE_FULL, null, 2))}
                className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
              >
                Reset to full example
              </button>
            </div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Request body (JSON)</label>
            <textarea
              value={lessonPayload}
              onChange={(e) => setLessonPayload(e.target.value)}
              rows={22}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-6 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => runAiPost('/ai/lessons/generate', lessonPayload)}
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-500/25"
            >
              {loading ? 'Calling API…' : 'Generate lesson'}
            </button>

            <div className="mt-8 p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">GET /lessons</h3>
              <p className="text-sm text-slate-400 mb-4">
                Query: <code className="bg-slate-800 px-1 rounded">page</code>, <code className="bg-slate-800 px-1 rounded">perPage</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">search</code>.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-slate-400">
                  Page
                  <input
                    type="number"
                    min={1}
                    value={lessonsPage}
                    onChange={(e) => setLessonsPage(Number(e.target.value) || 1)}
                    className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100"
                  />
                </label>
                <label className="flex items-center gap-2 text-slate-400">
                  perPage
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={lessonsPerPage}
                    onChange={(e) => setLessonsPerPage(Number(e.target.value) || 20)}
                    className="w-24 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100"
                  />
                </label>
                <input
                  type="text"
                  value={lessonsSearch}
                  onChange={(e) => setLessonsSearch(e.target.value)}
                  placeholder="search"
                  className="flex-1 min-w-[140px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                />
                <button
                  type="button"
                  onClick={runLessonsList}
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'List lessons'}
                </button>
              </div>
            </div>

            <div className="mt-6 p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">GET /lessons/:id · DELETE /lessons/:id</h3>
              <p className="text-sm text-slate-400 mb-4">
                Full lesson: content, images, <code className="bg-slate-800 px-1 rounded">mini_test</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">audio_url</code>. If <code className="bg-slate-800 px-1 rounded">audio_url</code> is relative,
                media may be under GET <code className="bg-slate-800 px-1 rounded">/lessons/:id/media/:file</code>. DELETE returns{' '}
                <code className="bg-slate-800 px-1 rounded">{'{ "ok": true }'}</code> and removes generated media when possible.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="text"
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  placeholder="Lesson UUID"
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={runLessonGet}
                  disabled={loading || !lessonId.trim()}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Get lesson'}
                </button>
                <button
                  type="button"
                  onClick={runLessonDelete}
                  disabled={loading || !lessonId.trim()}
                  className="px-6 py-2.5 bg-red-900/50 text-red-200 font-medium rounded-xl hover:bg-red-900/70 disabled:opacity-50 border border-red-800/50"
                >
                  Delete lesson
                </button>
              </div>
            </div>
          </>
        )}

        {mainTab === 'education' && (
          <>
            <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 mb-6">
              <h3 className="text-slate-200 font-semibold mb-2">POST /ai/education-plans/generate</h3>
              <p className="text-sm text-slate-400">
                Required: <code className="bg-slate-800 px-1 rounded">documentId</code>, <code className="bg-slate-800 px-1 rounded">name</code>. Optional:{' '}
                <code className="bg-slate-800 px-1 rounded">language</code> (same as <code className="bg-slate-800 px-1 rounded">outputLanguage</code> — short
                codes <code className="bg-slate-800 px-1 rounded">az</code>, <code className="bg-slate-800 px-1 rounded">en</code>, etc.),{' '}
                <code className="bg-slate-800 px-1 rounded">periodMonths</code>, <code className="bg-slate-800 px-1 rounded">sessionsPerWeek</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">hoursPerSession</code>. Success is often <strong className="text-slate-300">HTTP 201</strong> with{' '}
                <code className="bg-slate-800 px-1 rounded">{'{ "plan": { "id", "content": [...] } }'}</code>; rows are also persisted server-side.
              </p>
            </div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Request body (JSON, camelCase)</label>
            <textarea
              value={educationPayload}
              onChange={(e) => setEducationPayload(e.target.value)}
              rows={14}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-6"
            />
            <button
              type="button"
              onClick={() => runAiPost('/ai/education-plans/generate', educationPayload)}
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-500/25"
            >
              {loading ? 'Calling API…' : 'Generate education plan'}
            </button>

            <div className="mt-8 p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">GET /education-plans</h3>
              <p className="text-sm text-slate-400 mb-4">
                Returns <code className="bg-slate-800 px-1 rounded">{'{ "items": [...] }'}</code> with <strong className="text-slate-300">full plan rows</strong>{' '}
                (including content). Optional query: <code className="bg-slate-800 px-1 rounded">search</code> only — there is no separate GET-by-id; find a plan
                in <code className="bg-slate-800 px-1 rounded">items</code> by <code className="bg-slate-800 px-1 rounded">id</code>.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  type="text"
                  value={educationPlansSearch}
                  onChange={(e) => setEducationPlansSearch(e.target.value)}
                  placeholder="search (optional)"
                  className="flex-1 min-w-[200px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                />
                <button
                  type="button"
                  onClick={runEducationPlansList}
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'List education plans'}
                </button>
              </div>
            </div>

            <div className="mt-6 p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">POST /education-plans · PATCH /education-plans/:id · DELETE /education-plans/:id</h3>
              <p className="text-sm text-slate-400 mb-4">
                REST writes use <strong className="text-slate-300">snake_case</strong> (e.g. <code className="bg-slate-800 px-1 rounded">period_months</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">document_ids</code>, <code className="bg-slate-800 px-1 rounded">content</code>).
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <input
                  type="text"
                  value={educationPlanRestId}
                  onChange={(e) => setEducationPlanRestId(e.target.value)}
                  placeholder="Plan UUID (for PATCH / DELETE)"
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    educationPlanRestId.trim()
                      ? runDeleteRequest(`/education-plans/${encodeURIComponent(educationPlanRestId.trim())}`)
                      : setResult({ error: 'Enter plan UUID for DELETE.' })
                  }
                  disabled={loading || !educationPlanRestId.trim()}
                  className="px-6 py-2.5 bg-red-900/50 text-red-200 font-medium rounded-xl hover:bg-red-900/70 disabled:opacity-50 border border-red-800/50"
                >
                  Delete plan
                </button>
              </div>
              <label className="block text-sm font-medium text-slate-300 mb-2">POST /education-plans</label>
              <textarea
                value={educationPlanCreatePayload}
                onChange={(e) => setEducationPlanCreatePayload(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-3"
              />
              <button
                type="button"
                onClick={() => runJsonRequest('POST', '/education-plans', educationPlanCreatePayload)}
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 mb-6"
              >
                Create plan (REST)
              </button>
              <label className="block text-sm font-medium text-slate-300 mb-2">PATCH /education-plans/:id</label>
              <textarea
                value={educationPlanPatchPayload}
                onChange={(e) => setEducationPlanPatchPayload(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-3"
              />
              <button
                type="button"
                onClick={() =>
                  educationPlanRestId.trim()
                    ? runJsonRequest(
                        'PATCH',
                        `/education-plans/${encodeURIComponent(educationPlanRestId.trim())}`,
                        educationPlanPatchPayload,
                      )
                    : setResult({ error: 'Enter plan UUID for PATCH.' })
                }
                disabled={loading}
                className="px-6 py-2.5 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 disabled:opacity-50 border border-slate-600"
              >
                Patch plan
              </button>
            </div>
          </>
        )}

        {mainTab === 'chat' && (
          <>
            <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 mb-6">
              <h3 className="text-slate-200 font-semibold mb-2">AI assistant — /ai/chat/conversations</h3>
              <p className="text-sm text-slate-400">
                Owner-scoped threads. Bodies use <strong className="text-slate-300">camelCase</strong>. Up to <strong className="text-slate-300">three</strong>{' '}
                <code className="bg-slate-800 px-1 rounded">documentIds</code> as RAG context when sending a message.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700 mb-6">
              <h3 className="text-slate-200 font-semibold mb-3">GET /ai/chat/conversations · POST /ai/chat/conversations</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  type="button"
                  onClick={runChatConversationsList}
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  List conversations
                </button>
              </div>
              <label className="block text-sm font-medium text-slate-300 mb-2">POST body (optional title, documentIds)</label>
              <textarea
                value={chatCreatePayload}
                onChange={(e) => setChatCreatePayload(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-3"
              />
              <button
                type="button"
                onClick={() => runJsonRequest('POST', '/ai/chat/conversations', chatCreatePayload)}
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                Create conversation
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700 mb-6">
              <h3 className="text-slate-200 font-semibold mb-3">
                GET /ai/chat/conversations/:id · PATCH · DELETE
              </h3>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <input
                  type="text"
                  value={chatConversationId}
                  onChange={(e) => setChatConversationId(e.target.value)}
                  placeholder="Conversation UUID"
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={runChatConversationGet}
                  disabled={loading || !chatConversationId.trim()}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  Get
                </button>
                <button
                  type="button"
                  onClick={() =>
                    chatConversationId.trim()
                      ? runDeleteRequest(`/ai/chat/conversations/${encodeURIComponent(chatConversationId.trim())}`)
                      : setResult({ error: 'Enter conversation UUID.' })
                  }
                  disabled={loading || !chatConversationId.trim()}
                  className="px-6 py-2.5 bg-red-900/50 text-red-200 font-medium rounded-xl hover:bg-red-900/70 disabled:opacity-50 border border-red-800/50"
                >
                  Delete
                </button>
              </div>
              <label className="block text-sm font-medium text-slate-300 mb-2">PATCH body</label>
              <textarea
                value={chatPatchPayload}
                onChange={(e) => setChatPatchPayload(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-3"
              />
              <button
                type="button"
                onClick={() =>
                  chatConversationId.trim()
                    ? runJsonRequest(
                        'PATCH',
                        `/ai/chat/conversations/${encodeURIComponent(chatConversationId.trim())}`,
                        chatPatchPayload,
                      )
                    : setResult({ error: 'Enter conversation UUID for PATCH.' })
                }
                disabled={loading}
                className="px-6 py-2.5 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 disabled:opacity-50 border border-slate-600"
              >
                Patch conversation
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700">
              <h3 className="text-slate-200 font-semibold mb-3">POST /ai/chat/conversations/:id/messages</h3>
              <p className="text-sm text-slate-400 mb-4">
                Required: <code className="bg-slate-800 px-1 rounded">message</code>. Optional: <code className="bg-slate-800 px-1 rounded">documentIds</code>{' '}
                (≤3), <code className="bg-slate-800 px-1 rounded">shortAnswer</code> (brief vs detailed style).
              </p>
              <textarea
                value={chatMessagePayload}
                onChange={(e) => setChatMessagePayload(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm mb-3"
              />
              <button
                type="button"
                onClick={() =>
                  chatConversationId.trim()
                    ? runJsonRequest(
                        'POST',
                        `/ai/chat/conversations/${encodeURIComponent(chatConversationId.trim())}/messages`,
                        chatMessagePayload,
                      )
                    : setResult({ error: 'Enter conversation UUID to post a message.' })
                }
                disabled={loading}
                className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                Send message
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="mt-10 p-6 rounded-2xl border bg-slate-900/80 border-slate-700">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Response</h2>
            {result.error ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">{result.error}</div>
            ) : (
              <>
                {result.status != null && (
                  <div className="mb-4">
                    <span className="text-slate-400">Status: </span>
                    <span className={result.status >= 200 && result.status < 300 ? 'text-emerald-400' : 'text-amber-400'}>
                      {result.status}
                    </span>
                  </div>
                )}
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-sm overflow-auto max-h-96 font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
