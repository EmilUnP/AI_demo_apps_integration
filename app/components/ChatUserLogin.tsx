'use client';

import { useState } from 'react';
import {
  ChatUser,
  clearChatUser,
  createVisitorId,
  loadChatUser,
  saveChatUser,
} from '@/lib/chatSession';
import { AssistantId } from '@/lib/chatTypes';

interface ChatUserLoginProps {
  assistantId?: AssistantId;
  user: ChatUser | null;
  onLogin: (user: ChatUser) => void;
  onLogout: () => void;
}

export default function ChatUserLogin({
  assistantId = 'personaai-guide',
  user,
  onLogin,
  onLogout,
}: ChatUserLoginProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Ad və email daxil edin.');
      return;
    }

    setLoading(true);
    setError('');

    const existing = loadChatUser();
    const visitorId = existing?.visitorId || createVisitorId();

    try {
      const res = await fetch('/api/chat/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId,
          name: name.trim(),
          email: email.trim(),
          visitor_id: visitorId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Login failed');
      }
      const nextUser: ChatUser = {
        name: data.data?.name || name.trim(),
        email: data.data?.email || email.trim(),
        visitorId: data.data?.visitor_id || visitorId,
      };
      saveChatUser(nextUser);
      onLogin(nextUser);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
      const nextUser: ChatUser = { name: name.trim(), email: email.trim(), visitorId };
      saveChatUser(nextUser);
      onLogin(nextUser);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          Çıxış
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adınız"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? '...' : 'Daxil ol'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">Daxil olun, sonra köməkçi seçin.</p>
    </form>
  );
}

export const logoutChatUser = (): void => {
  clearChatUser();
};
