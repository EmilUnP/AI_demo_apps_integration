'use client';

import { ApiTestDebugInfo } from '@/lib/assistantsApiTestLog';

interface AssistantsApiRequestInspectorProps {
  logs: ApiTestDebugInfo[];
  onClear: () => void;
}

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

export default function AssistantsApiRequestInspector({ logs, onClear }: AssistantsApiRequestInspectorProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <h2 className="text-sm font-semibold text-slate-200">Last API requests</h2>
        <p className="mt-2 text-xs text-slate-500">
          Send a chat message or click Dinlə — the real upstream URL, headers, and body appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Last API requests</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            What this test app actually sent to your API (upstream). API keys are masked.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
        >
          Clear
        </button>
      </div>

      <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
        {logs.map((log, index) => (
          <div key={`${log.at}-${log.kind}-${index}`} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-indigo-950 px-2 py-0.5 font-medium text-indigo-300 uppercase">
                {log.kind}
              </span>
              <span className="text-slate-500">{new Date(log.at).toLocaleString('az-AZ')}</span>
              <span
                className={`rounded px-2 py-0.5 ${
                  log.response.status >= 200 && log.response.status < 300
                    ? 'bg-emerald-950 text-emerald-300'
                    : 'bg-red-950 text-red-300'
                }`}
              >
                HTTP {log.response.status}
              </span>
              <span className="text-slate-500">{log.response.contentType}</span>
            </div>

            <div className="space-y-3">
              <section>
                <p className="mb-1 text-xs font-medium text-emerald-300">
                  Upstream (real API) — {log.upstream.method} {log.upstream.url}
                </p>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Headers</p>
                <pre className="mb-2 overflow-x-auto rounded bg-slate-950 p-2 text-[11px] text-slate-300">
                  {formatJson(log.upstream.headers)}
                </pre>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Body</p>
                <pre className="overflow-x-auto rounded bg-slate-950 p-2 text-[11px] text-slate-300 whitespace-pre-wrap break-words">
                  {formatJson(log.upstream.body)}
                </pre>
              </section>

              <section>
                <p className="mb-1 text-xs font-medium text-amber-200">
                  Browser → proxy — {log.browserToProxy.method} {log.browserToProxy.url}
                </p>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Headers</p>
                <pre className="mb-2 overflow-x-auto rounded bg-slate-950 p-2 text-[11px] text-slate-300">
                  {formatJson(log.browserToProxy.headers)}
                </pre>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Body</p>
                <pre className="overflow-x-auto rounded bg-slate-950 p-2 text-[11px] text-slate-300 whitespace-pre-wrap break-words">
                  {formatJson(log.browserToProxy.body)}
                </pre>
              </section>

              {log.response.preview && (
                <section>
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Response preview</p>
                  <pre className="overflow-x-auto rounded bg-slate-950 p-2 text-[11px] text-slate-400 whitespace-pre-wrap break-words">
                    {log.response.preview}
                  </pre>
                </section>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
