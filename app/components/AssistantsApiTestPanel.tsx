'use client';

import {
  AssistantsApiTestOptions,
  DEFAULT_ASSISTANTS_API_TEST_OPTIONS,
  LEGACY_ASSISTANTS_API_TEST_OPTIONS,
  describeChatBodyFields,
  describeTtsBodyFields,
} from '@/lib/assistantsApiTestOptions';
import { ChatUser } from '@/lib/chatSession';

interface AssistantsApiTestPanelProps {
  options: AssistantsApiTestOptions;
  onChange: (options: AssistantsApiTestOptions) => void;
  user: ChatUser | null;
}

const TOGGLES: Array<{
  key: keyof AssistantsApiTestOptions;
  label: string;
  hint: string;
  group: 'chat' | 'tts';
}> = [
  {
    key: 'includeChatLanguage',
    label: 'language',
    hint: 'POST /v1/chat',
    group: 'chat',
  },
  {
    key: 'includeExternalUserId',
    label: 'external_user_id',
    hint: 'POST /v1/chat',
    group: 'chat',
  },
  {
    key: 'includeExternalUserName',
    label: 'external_user_name',
    hint: 'new — POST /v1/chat',
    group: 'chat',
  },
  {
    key: 'includeExternalUserEmail',
    label: 'external_user_email',
    hint: 'new — POST /v1/chat',
    group: 'chat',
  },
  {
    key: 'includeConversationMemory',
    label: 'conversation_id / new_conversation',
    hint: 'POST /v1/chat',
    group: 'chat',
  },
  {
    key: 'includeTtsLanguage',
    label: 'language',
    hint: 'POST /v1/tts',
    group: 'tts',
  },
  {
    key: 'includeTtsGender',
    label: 'gender (female)',
    hint: 'new — POST /v1/tts',
    group: 'tts',
  },
];

export default function AssistantsApiTestPanel({ options, onChange, user }: AssistantsApiTestPanelProps) {
  const setOption = (key: keyof AssistantsApiTestOptions, value: boolean) => {
    onChange({ ...options, [key]: value });
  };

  const chatFields = describeChatBodyFields(options, user);
  const ttsFields = describeTtsBodyFields(options);

  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-amber-200">API test — request body fields</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Uncheck to omit a field from the JSON body (simulate older third-party clients).
            New fields are optional — old integrations that send only the core body should keep working.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_ASSISTANTS_API_TEST_OPTIONS })}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            New API (all)
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...LEGACY_ASSISTANTS_API_TEST_OPTIONS })}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Old API (minimal)
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Chat body</p>
          <div className="space-y-2">
            {TOGGLES.filter((item) => item.group === 'chat').map((item) => (
              <label key={item.key} className="flex cursor-pointer items-start gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={options[item.key]}
                  onChange={(e) => setOption(item.key, e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 bg-slate-900"
                />
                <span>
                  <code className="rounded bg-slate-900 px-1 text-xs text-indigo-200">{item.label}</code>
                  <span className="mt-0.5 block text-xs text-slate-500">{item.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">TTS body</p>
          <div className="space-y-2">
            {TOGGLES.filter((item) => item.group === 'tts').map((item) => (
              <label key={item.key} className="flex cursor-pointer items-start gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={options[item.key]}
                  onChange={(e) => setOption(item.key, e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 bg-slate-900"
                />
                <span>
                  <code className="rounded bg-slate-900 px-1 text-xs text-indigo-200">{item.label}</code>
                  <span className="mt-0.5 block text-xs text-slate-500">{item.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
        <p>
          <span className="text-slate-500">POST /v1/chat sends:</span>{' '}
          {chatFields.map((field) => (
            <code key={field} className="mr-1 rounded bg-slate-900 px-1 text-slate-300">
              {field}
            </code>
          ))}
        </p>
        <p className="mt-2">
          <span className="text-slate-500">POST /v1/tts sends:</span>{' '}
          {ttsFields.map((field) => (
            <code key={field} className="mr-1 rounded bg-slate-900 px-1 text-slate-300">
              {field}
            </code>
          ))}
        </p>
      </div>
    </div>
  );
}
