'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ChatInterface from '../components/ChatInterface';
import ChatHistorySidebar from '../components/ChatHistorySidebar';
import ChatUserLogin, { logoutChatUser } from '../components/ChatUserLogin';
import AssistantsApiTestPanel from '../components/AssistantsApiTestPanel';
import AssistantsApiRequestInspector from '../components/AssistantsApiRequestInspector';
import AssistantModeToggle from '../components/AssistantModeToggle';
import { ChatUser, loadChatUser } from '@/lib/chatSession';
import {
  AssistantMode,
  loadAssistantMode,
  saveAssistantMode,
} from '@/lib/assistantMode';
import {
  AssistantsApiTestOptions,
  DEFAULT_ASSISTANTS_API_TEST_OPTIONS,
  loadAssistantsApiTestOptions,
  saveAssistantsApiTestOptions,
} from '@/lib/assistantsApiTestOptions';
import { ApiTestDebugInfo } from '@/lib/assistantsApiTestLog';

interface Assistant {
  id: string;
  name: string;
  description: string;
  image: string;
  apiKey: string;
  apiId: string;
  taskApiKey?: string;
  supportsTaskMode?: boolean;
}

const defaultApiKey = process.env.NEXT_PUBLIC_API_KEY || '';
const taskApiKey = process.env.NEXT_PUBLIC_TASK_API_KEY?.trim() || '';
const personaAiGuideName = process.env.NEXT_PUBLIC_ASSISTANT_NAME?.trim() || 'PersonaAI Guide';

const getApiKey = (index: number) => {
  if (defaultApiKey) return defaultApiKey;
  const keys = [
    process.env.NEXT_PUBLIC_API_KEY_1,
    process.env.NEXT_PUBLIC_API_KEY_2,
    process.env.NEXT_PUBLIC_API_KEY_3,
    process.env.NEXT_PUBLIC_API_KEY_4,
  ];
  return keys[index] || '';
};

const assistants: Assistant[] = [
  {
    id: 'personaai-guide',
    name: personaAiGuideName,
    description: process.env.NEXT_PUBLIC_ASSISTANT_DESCRIPTION?.trim() || 'PersonaAI söhbət köməkçisi',
    image: '/assistants/assistant-purple.png',
    apiKey: getApiKey(0),
    apiId: '1',
    taskApiKey: taskApiKey || undefined,
    supportsTaskMode: !!taskApiKey,
  },
  {
    id: 'serp',
    name: 'SERP dəstək',
    description: 'SERP sualları',
    image: '/assistants/assistant-green.png',
    apiKey: getApiKey(1),
    apiId: '2',
  },
  {
    id: 'texniki',
    name: 'Texniki Kömək',
    description: 'Texniki dəstək',
    image: '/assistants/assistant-pink.png',
    apiKey: getApiKey(2),
    apiId: '3',
  },
  {
    id: 'satis',
    name: 'Satış',
    description: 'Məhsul məlumatı',
    image: '/assistants/assistant-orange.png',
    apiKey: getApiKey(3),
    apiId: '4',
  },
];

export default function AssistantsPage() {
  const [user, setUser] = useState<ChatUser | null>(null);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [apiTestOptions, setApiTestOptions] = useState<AssistantsApiTestOptions>(
    DEFAULT_ASSISTANTS_API_TEST_OPTIONS
  );
  const [requestLogs, setRequestLogs] = useState<ApiTestDebugInfo[]>([]);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('chat');

  const selectedAssistant = useMemo(
    () => assistants.find((a) => a.id === selectedAssistantId) ?? null,
    [selectedAssistantId]
  );

  useEffect(() => {
    const saved = loadChatUser();
    if (saved) setUser(saved);
    setApiTestOptions(loadAssistantsApiTestOptions());
    setAssistantMode(loadAssistantMode());
  }, []);

  const handleApiTestOptionsChange = (next: AssistantsApiTestOptions) => {
    setApiTestOptions(next);
    saveAssistantsApiTestOptions(next);
  };

  const handleRequestLogged = (entry: ApiTestDebugInfo) => {
    setRequestLogs((prev) => [entry, ...prev].slice(0, 12));
  };

  const handleModeChange = (mode: AssistantMode) => {
    setAssistantMode(mode);
    saveAssistantMode(mode);
    setConversationId(null);
  };

  const taskModeActive =
    selectedAssistant?.supportsTaskMode && assistantMode === 'task';

  const handleLogout = () => {
    logoutChatUser();
    setUser(null);
    setSelectedAssistantId(null);
    setConversationId(null);
  };

  const handleSelectAssistant = (id: string) => {
    if (!user) return;
    const assistant = assistants.find((a) => a.id === id);
    if (!assistant?.supportsTaskMode && assistantMode === 'task') {
      setAssistantMode('chat');
      saveAssistantMode('chat');
    }
    setSelectedAssistantId(id);
    setConversationId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold text-indigo-400 hover:text-indigo-300">
            Demo Səhifə
          </Link>
          <Link href="/test-api" className="text-sm text-slate-400 hover:text-indigo-300">
            API Test
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Köməkçilər</h1>
          <p className="mt-1 text-sm text-slate-400">Daxil olun və köməkçi ilə söhbət edin</p>
        </div>

        <ChatUserLogin
          apiKey={defaultApiKey}
          user={user}
          onLogin={setUser}
          onLogout={handleLogout}
        />

        <AssistantsApiTestPanel
          options={apiTestOptions}
          onChange={handleApiTestOptionsChange}
          user={user}
        />

        <AssistantsApiRequestInspector logs={requestLogs} onClear={() => setRequestLogs([])} />

        <div>
          <h2 className="mb-3 text-sm font-medium text-slate-400">Köməkçilər</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {assistants.map((assistant) => {
              const isSelected = selectedAssistantId === assistant.id;
              const isDisabled = !user || !assistant.apiKey;

              return (
                <button
                  key={assistant.id}
                  type="button"
                  onClick={() => handleSelectAssistant(assistant.id)}
                  disabled={isDisabled}
                  className={`flex flex-col items-center rounded-xl border p-4 text-center transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600/10 shadow-lg shadow-indigo-500/10'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/50'
                  }`}
                >
                  <img
                    src={assistant.image}
                    alt=""
                    className="mb-3 h-16 w-16 rounded-xl object-cover bg-slate-800"
                  />
                  <p className="text-sm font-medium text-white leading-tight">{assistant.name}</p>
                  {assistant.supportsTaskMode && (
                    <span className="mt-1 rounded bg-amber-950/50 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                      Chat + Task
                    </span>
                  )}
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{assistant.description}</p>
                </button>
              );
            })}
          </div>
          {!user && (
            <p className="mt-2 text-xs text-slate-500">Köməkçi seçmək üçün əvvəlcə daxil olun.</p>
          )}
        </div>

        {selectedAssistant && user && (
          <div
            key={`${selectedAssistantId}-${assistantMode}`}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3">
              <img src={selectedAssistant.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-white">{selectedAssistant.name}</h3>
                <p className="text-xs text-slate-500">
                  {taskModeActive
                    ? 'Task mode · tickets & slash commands'
                    : conversationId
                      ? `Söhbət · ${conversationId.slice(0, 8)}…`
                      : 'Yeni söhbət'}
                </p>
              </div>
              {selectedAssistant.supportsTaskMode && (
                <AssistantModeToggle
                  mode={assistantMode}
                  onChange={handleModeChange}
                  taskAvailable={!!selectedAssistant.taskApiKey}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setConversationId(null);
                  setSelectedAssistantId(null);
                }}
                className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label="Köməkçini bağla"
                title="Köməkçini bağla"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex h-[520px] min-h-0 flex-col overflow-hidden lg:flex-row">
              {!taskModeActive && (
                <div className="h-36 shrink-0 overflow-hidden border-b border-slate-800 lg:h-auto lg:w-[220px] lg:border-b-0 lg:border-r">
                  <ChatHistorySidebar
                    assistantId={selectedAssistant.id}
                    apiKey={selectedAssistant.apiKey}
                    user={user}
                    activeConversationId={conversationId}
                    refreshKey={historyRefresh}
                    onSelectConversation={setConversationId}
                    onConversationsChange={() => {}}
                  />
                </div>
              )}
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <ChatInterface
                  assistantId={selectedAssistant.id}
                  assistantName={selectedAssistant.name}
                  apiKey={selectedAssistant.apiKey}
                  taskApiKey={selectedAssistant.taskApiKey}
                  assistantMode={assistantMode}
                  apiId={selectedAssistant.apiId}
                  user={user}
                  conversationId={conversationId}
                  apiTestOptions={apiTestOptions}
                  onConversationIdChange={setConversationId}
                  onRequestLogged={handleRequestLogged}
                  onSessionCompleted={() => setHistoryRefresh((k) => k + 1)}
                  onClose={() => setSelectedAssistantId(null)}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
