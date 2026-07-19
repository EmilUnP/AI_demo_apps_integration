'use client';

import { useEffect, useState } from 'react';
import { ChatUser, ConversationSummary, loadConversationSummaries } from '@/lib/chatSession';
import { AssistantId } from '@/lib/chatTypes';

interface ChatHistorySidebarProps {
  assistantId: AssistantId;
  user: ChatUser;
  activeConversationId: string | null;
  refreshKey?: number;
  onSelectConversation: (conversationId: string | null) => void;
  onNewConversation: () => void;
  onConversationsChange: (conversations: ConversationSummary[]) => void;
}

const statusLabel = (status?: string) => {
  if (status === 'completed') return 'Tamamlandı';
  if (status === 'active') return 'Aktiv';
  return null;
};

export default function ChatHistorySidebar({
  assistantId,
  user,
  activeConversationId,
  refreshKey = 0,
  onSelectConversation,
  onNewConversation,
  onConversationsChange,
}: ChatHistorySidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const refreshConversations = async () => {
    const local = loadConversationSummaries(assistantId);
    setConversations(local);
    onConversationsChange(local);

    try {
      const params = new URLSearchParams({
        assistantId,
        external_user_id: user.visitorId,
      });
      const res = await fetch(`/api/chat/conversations?${params}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        const remote: ConversationSummary[] = data.data.map((item: Record<string, unknown>) => ({
          id: String(item.id || item.conversation_id || ''),
          title: String(item.title || item.preview || 'Söhbət'),
          preview: typeof item.preview === 'string' ? item.preview : undefined,
          updatedAt: String(item.updatedAt || item.updated_at || new Date().toISOString()),
          assistantId,
          status: typeof item.status === 'string' ? item.status : 'active',
          satisfaction_rating:
            typeof item.satisfaction_rating === 'number' ? item.satisfaction_rating : null,
        }));
        setConversations(remote);
        onConversationsChange(remote);
      }
    } catch {
      // keep local cache
    }
  };

  useEffect(() => {
    void refreshConversations();
  }, [assistantId, user.visitorId, refreshKey]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-950/80">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-300">Tarixçə</h3>
        <button
          type="button"
          onClick={onNewConversation}
          className="rounded-lg px-2.5 py-1 text-xs text-indigo-300 hover:bg-indigo-500/10 transition"
        >
          + Yeni
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <p className="p-3 text-xs text-slate-500">Hələ söhbət yoxdur.</p>
        ) : (
          conversations.map((conversation) => {
            const label = statusLabel(conversation.status);
            return (
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
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm truncate flex-1">{conversation.title}</p>
                  {label && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        conversation.status === 'completed'
                          ? 'bg-slate-700 text-slate-400'
                          : 'bg-emerald-950 text-emerald-400'
                      }`}
                    >
                      {label}
                    </span>
                  )}
                </div>
                {conversation.preview && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{conversation.preview}</p>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
