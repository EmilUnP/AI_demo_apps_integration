'use client';

import { useEffect, useRef, useState } from 'react';
import { WIDGET_DEFAULTS } from '@/lib/assistantsConfig';
import { createVisitorId } from '@/lib/chatSession';
import {
  ChatLanguage,
  ChatSuggestion,
  ClarificationOption,
  parseChatSuccessData,
} from '@/lib/chatTypes';
import { useAssistantTts } from '@/lib/useAssistantTts';
import { useMicStt } from '@/lib/useMicStt';
import { consumeChatSse, isSseContentType } from '@/lib/chatStream';

type WidgetMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  clarificationOptions?: ClarificationOption[];
  suggestions?: ChatSuggestion[];
};

const WIDGET_VISITOR_KEY = 'personaai_widget_visitor';
const WIDGET_CONVERSATION_KEY = 'personaai_widget_conversation';

const loadWidgetVisitorId = (): string => {
  try {
    const existing = localStorage.getItem(WIDGET_VISITOR_KEY);
    if (existing) return existing;
    const id = createVisitorId();
    localStorage.setItem(WIDGET_VISITOR_KEY, id);
    return id;
  } catch {
    return createVisitorId();
  }
};

const loadSavedConversationId = (): string | null => {
  try {
    return localStorage.getItem(WIDGET_CONVERSATION_KEY);
  } catch {
    return null;
  }
};

const saveConversationId = (id: string | null) => {
  try {
    if (id) localStorage.setItem(WIDGET_CONVERSATION_KEY, id);
    else localStorage.removeItem(WIDGET_CONVERSATION_KEY);
  } catch {
    // ignore
  }
};

export default function ChatButton() {
  const {
    assistantId,
    title,
    subtitle,
    greeting,
    primaryColor,
    accentColor,
    position,
    language,
  } = WIDGET_DEFAULTS;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([
    { id: 'greeting', role: 'assistant', content: greeting },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [forceNew, setForceNew] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [savedRating, setSavedRating] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [error, setError] = useState('');
  const [visitorId, setVisitorId] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const { play, playingId, loadingId, error: ttsError, stop } = useAssistantTts({
    assistantId,
    language: language as ChatLanguage,
  });

  const {
    isRecording,
    isTranscribing,
    error: sttError,
    toggleRecording,
  } = useMicStt({
    assistantId,
    language: language as ChatLanguage,
    onTranscript: (text) => {
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    },
  });

  useEffect(() => {
    const visitor = loadWidgetVisitorId();
    setVisitorId(visitor);
    const savedId = loadSavedConversationId();
    if (savedId) {
      setConversationId(savedId);
      void hydrateConversation(savedId);
    } else {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const clickedOutsideContainer =
        containerRef.current && target ? !containerRef.current.contains(target) : false;
      const clickedOutsideButton =
        buttonRef.current && target ? !buttonRef.current.contains(target) : false;
      if (clickedOutsideContainer && clickedOutsideButton) setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen, showFeedback]);

  const hydrateConversation = async (id: string) => {
    try {
      const params = new URLSearchParams({ assistantId });
      const res = await fetch(
        `/api/chat/conversations/${encodeURIComponent(id)}/messages?${params}`
      );
      const data = await res.json();
      if (data.data?.status === 'completed') {
        setSessionCompleted(true);
        setSavedRating(
          typeof data.data?.satisfaction_rating === 'number'
            ? data.data.satisfaction_rating
            : null
        );
      }
      const raw = data.data?.messages;
      if (Array.isArray(raw) && raw.length > 0) {
        setMessages(
          raw.map((item: Record<string, string>, index: number) => ({
            id: item.id || `m-${index}`,
            role:
              item.role === 'assistant' || item.sender === 'assistant' ? 'assistant' : 'user',
            content: item.content || item.message || item.text || '',
          }))
        );
      }
    } catch {
      // keep greeting
    } finally {
      setHydrated(true);
    }
  };

  const handleNewChat = () => {
    stop();
    setConversationId(null);
    saveConversationId(null);
    setForceNew(true);
    setSessionCompleted(false);
    setSavedRating(null);
    setShowFeedback(false);
    setFeedbackRating(null);
    setFeedbackText('');
    setFeedbackError('');
    setError('');
    setMessages([{ id: 'greeting', role: 'assistant', content: greeting }]);
  };

  const sendMessage = async (textOverride?: string, optionId?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading || sessionCompleted || !visitorId) return;

    const userMessage: WidgetMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [
      ...prev.map((m) =>
        m.role === 'assistant'
          ? { ...m, clarificationOptions: undefined, suggestions: undefined }
          : m
      ),
      userMessage,
    ]);
    if (!textOverride) setInput('');
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          assistantId,
          language,
          stream: true,
          external_user_id: visitorId,
          ...(forceNew
            ? { new_conversation: true }
            : conversationId
              ? { conversation_id: conversationId }
              : {}),
          ...(optionId ? { option_id: optionId } : {}),
        }),
      });

      if (forceNew) setForceNew(false);

      if (res.status === 409) {
        setSessionCompleted(true);
        throw new Error('This conversation is closed. Start a new chat.');
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        if (errBody?.code === 'CONVERSATION_NOT_ACTIVE') {
          setSessionCompleted(true);
          throw new Error('This conversation is closed. Start a new chat.');
        }
        throw new Error(errBody?.error || errBody?.message || 'Chat failed');
      }

      let payload: unknown;
      const contentType = res.headers.get('content-type');

      if (isSseContentType(contentType)) {
        const streamingId = `stream-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: streamingId, role: 'assistant', content: '' },
        ]);
        payload = await consumeChatSse(res, {
          onDelta: (delta) => {
            if (!delta) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId ? { ...m, content: m.content + delta } : m
              )
            );
          },
        });
      } else {
        payload = await res.json();
      }

      let data = payload as Record<string, any>;
      if (data?.success === false) {
        throw new Error(data.error || data.message || 'Chat failed');
      }
      if (data?.success == null && (data?.response || data?.conversation_id || data?.response_type)) {
        data = { success: true, data };
      }

      const parsed = parseChatSuccessData(data);
      const nextId = parsed.conversationId;
      if (nextId) {
        setConversationId(nextId);
        saveConversationId(nextId);
      }

      const reply =
        parsed.responseText ||
        (parsed.clarificationOptions.length
          ? 'Please choose an option:'
          : 'No response');

      setMessages((prev) => {
        const withoutStream = prev.filter((m) => !m.id.startsWith('stream-'));
        return [
          ...withoutStream,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: reply,
            clarificationOptions:
              parsed.clarificationOptions.length > 0
                ? parsed.clarificationOptions
                : undefined,
            suggestions: parsed.suggestions.length > 0 ? parsed.suggestions : undefined,
          },
        ];
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Chat failed');
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('stream-')));
    } finally {
      setIsLoading(false);
    }
  };

  const submitFeedback = async (skip = false) => {
    if (!conversationId) return;
    if (!skip && feedbackRating == null) {
      setFeedbackError('Please choose a rating or skip.');
      return;
    }
    setIsSubmittingFeedback(true);
    setFeedbackError('');
    try {
      const res = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId,
          conversation_id: conversationId,
          ...(skip
            ? { skip_rating: true }
            : {
                rating: feedbackRating,
                helpful: (feedbackRating ?? 0) >= 3,
                ...(feedbackText.trim() ? { feedback_text: feedbackText.trim() } : {}),
              }),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Feedback failed');
      }
      if (data.data?.status === 'completed' || data.data?.already_completed || res.ok) {
        setSessionCompleted(true);
        setShowFeedback(false);
        setSavedRating(
          typeof data.data?.satisfaction_rating === 'number'
            ? data.data.satisfaction_rating
            : feedbackRating
        );
      }
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Feedback failed');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const positionClass =
    position === 'bottom-left' ? 'left-6 right-auto' : 'right-6 left-auto';

  return (
    <>
      <div className={`fixed bottom-6 z-[9998] ${positionClass}`}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-16 h-16 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center hover:scale-110 ${
            !isOpen ? 'animate-pulse-ring' : ''
          }`}
          style={{ backgroundColor: primaryColor }}
          aria-label="Toggle chat"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="typing-dots" aria-hidden>
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[9996]"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={containerRef}
            className="chat-container"
            aria-modal="true"
            role="dialog"
            aria-label={title}
          >
            <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-slate-950 text-slate-100 shadow-2xl border border-slate-800">
              <header
                className="shrink-0 px-4 py-3 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold leading-tight">{title}</h2>
                    <p className="text-xs text-white/80">{subtitle}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="rounded-lg px-2 py-1 text-xs bg-white/15 hover:bg-white/25"
                    >
                      New
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-1.5 bg-white/15 hover:bg-white/25"
                      aria-label="Close chat"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </header>

              <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {!hydrated ? (
                  <p className="text-xs text-slate-500 p-2">Loading…</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'text-white'
                            : 'bg-slate-800 text-slate-100 border border-slate-700'
                        }`}
                        style={
                          message.role === 'user' ? { backgroundColor: primaryColor } : undefined
                        }
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>

                        {message.clarificationOptions &&
                          message.clarificationOptions.length > 0 &&
                          !sessionCompleted && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {message.clarificationOptions.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => void sendMessage(option.label, option.id)}
                                  className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20 disabled:opacity-50"
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}

                        {message.suggestions &&
                          message.suggestions.length > 0 &&
                          !sessionCompleted && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {message.suggestions.map((suggestion, idx) => (
                                <button
                                  key={`${suggestion.message}-${idx}`}
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => void sendMessage(suggestion.message)}
                                  className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-900/50 disabled:opacity-50"
                                >
                                  {suggestion.label || suggestion.message}
                                </button>
                              ))}
                            </div>
                          )}

                        {message.role === 'assistant' &&
                          message.id !== 'greeting' &&
                          !message.id.startsWith('stream-') &&
                          !sessionCompleted && (
                            <button
                              type="button"
                              onClick={() => void play(message.id, message.content)}
                              disabled={loadingId === message.id}
                              className="mt-2 text-[11px] text-slate-400 hover:text-white disabled:opacity-50"
                            >
                              {loadingId === message.id
                                ? 'Loading…'
                                : playingId === message.id
                                  ? 'Stop'
                                  : 'Listen'}
                            </button>
                          )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && !messages.some((m) => m.id.startsWith('stream-')) && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-slate-400">
                      Thinking…
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-800 p-3 space-y-2">
                {sessionCompleted && (
                  <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300 flex items-center justify-between gap-2">
                    <span>
                      Chat completed
                      {savedRating != null ? ` · ${savedRating}/5` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="rounded px-2 py-1 text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      New chat
                    </button>
                  </div>
                )}

                {showFeedback && conversationId && !sessionCompleted && (
                  <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 space-y-2">
                    <p className="text-xs text-slate-300">Rate this chat</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className={`text-lg ${
                            feedbackRating != null && star <= feedbackRating
                              ? 'text-amber-400'
                              : 'text-slate-600'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={2}
                      placeholder="Optional comment"
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    />
                    {feedbackError && <p className="text-[11px] text-red-400">{feedbackError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isSubmittingFeedback}
                        onClick={() => void submitFeedback(false)}
                        className="rounded px-2 py-1 text-xs text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        Submit
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingFeedback}
                        onClick={() => void submitFeedback(true)}
                        className="rounded border border-slate-600 px-2 py-1 text-xs"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                )}

                {(error || ttsError || sttError) && (
                  <p className="text-[11px] text-red-400">{error || ttsError || sttError}</p>
                )}

                {!sessionCompleted && conversationId && !showFeedback && messages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowFeedback(true)}
                    className="text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    End & rate
                  </button>
                )}

                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    disabled={isLoading || sessionCompleted || isTranscribing}
                    placeholder="Type a message…"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={isLoading || sessionCompleted || isTranscribing}
                    title="Mic — fill message box, no auto-send"
                    className={`rounded-xl border px-2.5 py-2 disabled:opacity-50 ${
                      isRecording
                        ? 'border-rose-500 text-rose-300'
                        : 'border-slate-700 text-slate-300'
                    }`}
                    aria-label={isRecording ? 'Stop recording' : 'Voice input'}
                  >
                    {isTranscribing ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0m5 5v3m-3 0h6" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || isLoading || sessionCompleted || isTranscribing}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: accentColor }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
