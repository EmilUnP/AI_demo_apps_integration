'use client';

import { useEffect, useState } from 'react';
import { ChatUser, ConversationSummary, loadConversationSummaries } from '@/lib/chatSession';

interface ChatHistorySidebarProps {
  assistantId: string;
  shareLink?: string;
  apiKey: string;
  user: ChatUser;
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
  onConversationsChange: (conversations: ConversationSummary[]) => void;
}

export default function ChatHistorySidebar({
  assistantId,
  shareLink,
  apiKey,
  user,
  activeConversationId,
  onSelectConversation,
  onConversationsChange,
}: ChatHistorySidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const refreshConversations = async () => {
    const local = loadConversationSummaries(assistantId);
    setConversations(local);
    onConversationsChange(local);

    if (!apiKey) return;

    try {
      const params = new URLSearchParams({
        apiKey,
        visitor_id: user.visitorId,
      });
      if (shareLink?.trim()) params.set('assistant', shareLink.trim());
      const res = await fetch(`/api/chat/conversations?${params}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        const remote: ConversationSummary[] = data.data.map((item: Record<string, string>) => ({
          id: item.id || item.conversation_id,
          title: item.title || item.preview || 'Söhbət',
          preview: item.preview || item.last_message,
          updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
          assistantId,
        }));
        setConversations(remote);
        onConversationsChange(remote);
      }
    } catch {
      // keep local cache
    }
  };

  useEffect(() => {
    refreshConversations();
  }, [assistantId, apiKey, user.visitorId]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-950/80">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-300">Tarixçə</h3>
        <button
          type="button"
          onClick={() => onSelectConversation(null)}
          className="rounded-lg px-2.5 py-1 text-xs text-indigo-300 hover:bg-indigo-500/10 transition"
        >
          + Yeni
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <p className="p-3 text-xs text-slate-500">Hələ söhbət yoxdur.</p>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                activeConversationId === conversation.id
                  ? 'bg-indigo-600/15 text-white'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <p className="text-sm truncate">{conversation.title}</p>
              {conversation.preview && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{conversation.preview}</p>
              )}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
