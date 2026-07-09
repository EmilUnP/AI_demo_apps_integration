export interface ApiTestDebugInfo {
  at: string;
  kind: 'chat' | 'tts';
  mode?: 'chat' | 'task';
  keyType?: 'chat' | 'task';
  upstream: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
  };
  browserToProxy: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
  };
  response: {
    status: number;
    contentType: string;
    preview?: string;
  };
}

export const maskApiKey = (key: string): string => {
  const trimmed = key.trim();
  if (!trimmed) return '(empty)';
  if (trimmed.length <= 10) return '***';
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
};

export const maskAuthorizationHeader = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return trimmed;
  return `Bearer ${maskApiKey(trimmed.slice(7))}`;
};

export const headersForTestLog = (headers: HeadersInit): Record<string, string> => {
  const out: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] =
        key.toLowerCase() === 'authorization' ? maskAuthorizationHeader(value) : value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      out[key] =
        key.toLowerCase() === 'authorization' ? maskAuthorizationHeader(value) : value;
    }
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    out[key] =
      key.toLowerCase() === 'authorization' ? maskAuthorizationHeader(String(value)) : String(value);
  }
  return out;
};

export const sanitizeBrowserProxyBody = (body: Record<string, unknown>): Record<string, unknown> => {
  const copy = { ...body };
  if (typeof copy.apiKey === 'string') copy.apiKey = maskApiKey(copy.apiKey);
  return copy;
};

export const isApiTestDebugInfo = (value: unknown): value is ApiTestDebugInfo => {
  if (!value || typeof value !== 'object') return false;
  const v = value as ApiTestDebugInfo;
  return typeof v.kind === 'string' && !!v.upstream && !!v.browserToProxy;
};

export const extractTestDebug = (
  payload: unknown
): { debug: ApiTestDebugInfo | null; data: unknown } => {
  if (!payload || typeof payload !== 'object') return { debug: null, data: payload };
  const record = payload as Record<string, unknown>;
  if (!isApiTestDebugInfo(record._testDebug)) {
    return { debug: null, data: payload };
  }
  const { _testDebug, ...rest } = record;
  return { debug: _testDebug, data: rest };
};
