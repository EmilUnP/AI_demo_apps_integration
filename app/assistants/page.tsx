'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ChatInterface from '../components/ChatInterface';
import ChatHistorySidebar from '../components/ChatHistorySidebar';
import ChatUserLogin, { logoutChatUser } from '../components/ChatUserLogin';
import { ChatUser, loadChatUser } from '@/lib/chatSession';

interface Assistant {
  id: string;
  name: string;
  description: string;
  image: string;
  apiKey: string;
  apiId: string;
}

const defaultApiKey = process.env.NEXT_PUBLIC_API_KEY || '';
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

  const selectedAssistant = useMemo(
    () => assistants.find((a) => a.id === selectedAssistantId) ?? null,
    [selectedAssistantId]
  );

  useEffect(() => {
    const saved = loadChatUser();
    if (saved) setUser(saved);
  }, []);

  const handleLogout = () => {
    logoutChatUser();
    setUser(null);
    setSelectedAssistantId(null);
    setConversationId(null);
  };

  const handleSelectAssistant = (id: string) => {
    if (!user) return;
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

        {user && (
          <p className="text-xs text-slate-500">
            Söhbət zamanı API-yə göndərilir:{' '}
            <code className="rounded bg-slate-900 px-1">external_user_id</code> = {user.visitorId},{' '}
            <code className="rounded bg-slate-900 px-1">external_user_name</code> = {user.name},{' '}
            <code className="rounded bg-slate-900 px-1">external_user_email</code> = {user.email}
          </p>
        )}

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
            key={selectedAssistantId}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
          >
            <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
              <img src={selectedAssistant.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-white">{selectedAssistant.name}</h3>
                <p className="text-xs text-slate-500">
                  {conversationId ? `Söhbət · ${conversationId.slice(0, 8)}…` : 'Yeni söhbət'}
                </p>
              </div>
            </div>

            <div className="flex h-[520px] min-h-0 flex-col overflow-hidden lg:flex-row">
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
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <ChatInterface
                  assistantId={selectedAssistant.id}
                  assistantName={selectedAssistant.name}
                  apiKey={selectedAssistant.apiKey}
                  apiId={selectedAssistant.apiId}
                  user={user}
                  conversationId={conversationId}
                  onConversationIdChange={setConversationId}
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
