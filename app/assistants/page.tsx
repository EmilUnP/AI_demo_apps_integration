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
import { PUBLIC_ASSISTANTS } from '@/lib/assistantsConfig';
import { AssistantId } from '@/lib/chatTypes';

type AssistantCatalogItem = {
  id: AssistantId;
  name: string;
  description: string;
  image: string;
  chatConfigured: boolean;
  taskConfigured: boolean;
  supportsTaskMode: boolean;
};

export default function AssistantsPage() {
  const [user, setUser] = useState<ChatUser | null>(null);
  const [assistants, setAssistants] = useState<AssistantCatalogItem[]>(
    PUBLIC_ASSISTANTS.map((a) => ({
      ...a,
      chatConfigured: false,
      taskConfigured: false,
      supportsTaskMode: false,
    }))
  );
  const [selectedAssistantId, setSelectedAssistantId] = useState<AssistantId | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [forceNewConversation, setForceNewConversation] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [apiTestOptions, setApiTestOptions] = useState<AssistantsApiTestOptions>(
    DEFAULT_ASSISTANTS_API_TEST_OPTIONS
  );
  const [requestLogs, setRequestLogs] = useState<ApiTestDebugInfo[]>([]);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('chat');

  const selectedAssistant = useMemo(
    () => assistants.find((a) => a.id === selectedAssistantId) ?? null,
    [assistants, selectedAssistantId]
  );

  useEffect(() => {
    const saved = loadChatUser();
    if (saved) setUser(saved);
    setApiTestOptions(loadAssistantsApiTestOptions());
    setAssistantMode(loadAssistantMode());

    void fetch('/api/chat/assistants')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAssistants(data.data as AssistantCatalogItem[]);
        }
      })
      .catch(() => {
        // keep public defaults
      });
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
    setForceNewConversation(false);
  };

  const taskModeActive =
    selectedAssistant?.supportsTaskMode && assistantMode === 'task';

  const handleLogout = () => {
    logoutChatUser();
    setUser(null);
    setSelectedAssistantId(null);
    setConversationId(null);
    setForceNewConversation(false);
  };

  const handleSelectAssistant = (id: AssistantId) => {
    if (!user) return;
    const assistant = assistants.find((a) => a.id === id);
    if (!assistant?.supportsTaskMode && assistantMode === 'task') {
      setAssistantMode('chat');
      saveAssistantMode('chat');
    }
    setSelectedAssistantId(id);
    setConversationId(null);
    setForceNewConversation(false);
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setForceNewConversation(true);
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

        <ChatUserLogin user={user} onLogin={setUser} onLogout={handleLogout} />

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
              const isDisabled = !user || !assistant.chatConfigured;

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
                  {!assistant.chatConfigured && (
                    <p className="mt-1 text-[10px] text-rose-400">API key yoxdur</p>
                  )}
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
                    ? 'Task · TASK_API_KEY · external_user_id tələb olunur'
                    : conversationId
                      ? `Chat · ${conversationId.slice(0, 8)}…`
                      : forceNewConversation
                        ? 'Chat · yeni söhbət'
                        : 'Chat · aktiv thread (external_user_id)'}
                </p>
              </div>
              {selectedAssistant.supportsTaskMode && (
                <AssistantModeToggle
                  mode={assistantMode}
                  onChange={handleModeChange}
                  taskAvailable={selectedAssistant.taskConfigured}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setConversationId(null);
                  setForceNewConversation(false);
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
                    user={user}
                    activeConversationId={conversationId}
                    refreshKey={historyRefresh}
                    onSelectConversation={(id) => {
                      setForceNewConversation(false);
                      setConversationId(id);
                    }}
                    onNewConversation={handleNewConversation}
                    onConversationsChange={() => {}}
                  />
                </div>
              )}
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <ChatInterface
                  assistantId={selectedAssistant.id}
                  assistantName={selectedAssistant.name}
                  chatConfigured={selectedAssistant.chatConfigured}
                  taskConfigured={selectedAssistant.taskConfigured}
                  assistantMode={assistantMode}
                  defaultLanguage="auto"
                  user={user}
                  conversationId={conversationId}
                  forceNewConversation={forceNewConversation}
                  apiTestOptions={apiTestOptions}
                  onConversationIdChange={setConversationId}
                  onForceNewConversationConsumed={() => setForceNewConversation(false)}
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
