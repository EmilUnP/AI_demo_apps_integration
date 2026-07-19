'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessageContent, { messageHasTable } from './ChatMessageContent';
import {
  ChatUser,
  ConversationSummary,
  fromStoredMessage,
  loadStoredMessages,
  saveStoredMessages,
  toStoredMessage,
  upsertConversationSummary,
} from '@/lib/chatSession';
import { AssistantsApiTestOptions } from '@/lib/assistantsApiTestOptions';
import { ApiTestDebugInfo, extractTestDebug } from '@/lib/assistantsApiTestLog';
import { AssistantMode, TASK_QUICK_COMMANDS } from '@/lib/assistantMode';
import { parseTaskCommandFromResponse, resolveTaskDisplayContent, TaskCommandData } from '@/lib/taskCommand';
import TaskCommandView from './TaskCommandView';
import {
  AssistantId,
  CHAT_LANGUAGE_OPTIONS,
  ChatLanguage,
  ChatResponseType,
  ChatSuggestion,
  ClarificationOption,
  isSafeHttpUrl,
  parseChatSuccessData,
} from '@/lib/chatTypes';
import { useAssistantTts } from '@/lib/useAssistantTts';
import { useMicStt } from '@/lib/useMicStt';
import { consumeChatSse, isSseContentType } from '@/lib/chatStream';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{ title: string; url?: string; page?: string }>;
  taskCommand?: TaskCommandData;
  responseType?: ChatResponseType | null;
  clarificationOptions?: ClarificationOption[];
  suggestions?: ChatSuggestion[];
}

interface ChatInterfaceProps {
  assistantId: AssistantId;
  /** Optional legacy share_link — v1 resolves assistant from API key */
  shareLink?: string;
  assistantName: string;
  assistantMode?: AssistantMode;
  chatConfigured?: boolean;
  taskConfigured?: boolean;
  defaultLanguage?: ChatLanguage;
  user: ChatUser | null;
  conversationId: string | null;
  forceNewConversation?: boolean;
  apiTestOptions: AssistantsApiTestOptions;
  onConversationIdChange: (conversationId: string | null) => void;
  onForceNewConversationConsumed?: () => void;
  onRequestLogged?: (entry: ApiTestDebugInfo) => void;
  onClose: () => void;
  onSessionCompleted?: () => void;
}

export default function ChatInterface({
  assistantId,
  shareLink,
  assistantName,
  assistantMode = 'chat',
  chatConfigured = true,
  taskConfigured = false,
  defaultLanguage = 'auto',
  user,
  conversationId,
  forceNewConversation = false,
  apiTestOptions,
  onConversationIdChange,
  onForceNewConversationConsumed,
  onRequestLogged,
  onClose,
  onSessionCompleted,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [language, setLanguage] = useState<ChatLanguage>(defaultLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [showSessionFeedback, setShowSessionFeedback] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [savedRating, setSavedRating] = useState<number | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const visitorId = user?.visitorId || `guest-${assistantId}-${Date.now()}`;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isTaskMode = assistantMode === 'task';

  const {
    isRecording,
    isTranscribing,
    error: sttError,
    toggleRecording,
  } = useMicStt({
    assistantId,
    language,
    onTranscript: (text) => {
      setInputMessage((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
      inputRef.current?.focus();
    },
  });

  const {
    play: playTts,
    playingId: ttsPlayingId,
    loadingId: ttsLoadingId,
    error: ttsError,
    setError: setTtsError,
    stop: stopTts,
  } = useAssistantTts({
    assistantId,
    language,
    apiTestOptions,
    onRequestLogged,
    includeTestDebug: true,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setSessionCompleted(false);
      setShowSessionFeedback(false);
      setFeedbackRating(null);
      setFeedbackText('');
      setSavedRating(null);
      setTtsError('');
      stopTts();
      return;
    }

    const loadHistory = async () => {
      const cached = loadStoredMessages(conversationId).map(fromStoredMessage);
      if (cached.length > 0) setMessages(cached);

      try {
        const params = new URLSearchParams({ assistantId });
        const res = await fetch(
          `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages?${params}`
        );
        const data = await res.json();
        const threadStatus = data.data?.status as string | undefined;
        const rating =
          typeof data.data?.satisfaction_rating === 'number'
            ? data.data.satisfaction_rating
            : null;

        if (threadStatus === 'completed') {
          setSessionCompleted(true);
          setSavedRating(rating);
          persistConversation(
            conversationId,
            cached[0]?.content || 'Söhbət',
            'completed',
            rating
          );
        } else {
          setSessionCompleted(false);
          setSavedRating(null);
        }

        const raw = data.data?.messages || [];
        if (Array.isArray(raw) && raw.length > 0) {
          const loaded: Message[] = raw.map((item: Record<string, string>, index: number) => {
            const isAssistant =
              item.role === 'assistant' || item.sender === 'assistant';
            return {
              id: item.id || `remote-${index}`,
              role: (isAssistant ? 'assistant' : 'user') as Message['role'],
              content: item.content || item.message || item.text || '',
              timestamp: new Date(item.created_at || item.timestamp || Date.now()),
              sources: undefined,
            };
          });
          setMessages(loaded);
          saveStoredMessages(conversationId, loaded.map(toStoredMessage));
        }
      } catch {
        // keep cache
      }
    };

    void loadHistory();
  }, [conversationId, assistantId]);

  const persistConversation = (
    id: string,
    preview: string,
    status: ConversationSummary['status'] = 'active',
    satisfaction_rating?: number | null
  ) => {
    upsertConversationSummary({
      id,
      title: preview.slice(0, 48) || 'Söhbət',
      preview: preview.slice(0, 120),
      updatedAt: new Date().toISOString(),
      assistantId,
      status,
      satisfaction_rating,
    });
  };

  const persistMessages = (id: string, nextMessages: Message[]) => {
    saveStoredMessages(id, nextMessages.map(toStoredMessage));
  };

  const markConversationCompleted = async () => {
    if (!conversationId) return;
    try {
      const params = new URLSearchParams({ assistantId });
      const res = await fetch(
        `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages?${params}`
      );
      const data = await res.json();
      if (data.data?.status === 'completed') {
        setSessionCompleted(true);
        setShowSessionFeedback(false);
        const rating =
          typeof data.data?.satisfaction_rating === 'number'
            ? data.data.satisfaction_rating
            : null;
        setSavedRating(rating);
        persistConversation(
          conversationId,
          messages.find((m) => m.role === 'user')?.content || 'Söhbət',
          'completed',
          rating
        );
        onSessionCompleted?.();
      }
    } catch {
      // ignore
    }
  };

  const submitSessionFeedback = async (skipRating = false) => {
    if (!conversationId) return;

    if (!skipRating && feedbackRating == null) {
      setFeedbackError(
        'Zəhmət olmasa 1–5 ulduz seçin və ya "Qiymətləndirmədən bitir" düyməsini istifadə edin.'
      );
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
          ...(skipRating
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
        throw new Error(data.error || 'Feedback göndərilmədi');
      }

      const status = data.data?.status as string | undefined;
      const alreadyCompleted = data.data?.already_completed === true;

      if (status === 'completed' || alreadyCompleted || res.ok) {
        if (status === 'completed' || alreadyCompleted) {
          setSessionCompleted(true);
          setShowSessionFeedback(false);
          const rating =
            typeof data.data?.satisfaction_rating === 'number'
              ? data.data.satisfaction_rating
              : feedbackRating;
          setSavedRating(rating ?? null);
          persistConversation(
            conversationId,
            messages.find((m) => m.role === 'user')?.content || 'Söhbət',
            'completed',
            rating ?? null
          );
          onSessionCompleted?.();
        } else {
          await markConversationCompleted();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Feedback göndərilmədi';
      setFeedbackError(msg);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleStartNewAfterFeedback = () => {
    setSessionCompleted(false);
    setShowSessionFeedback(false);
    setFeedbackRating(null);
    setFeedbackText('');
    setSavedRating(null);
    setMessages([]);
    onConversationIdChange(null);
  };

  const handlePrefillTaskCommand = (message: string) => {
    setInputMessage(message);
    inputRef.current?.focus();
  };

  const handleCloseConversation = () => {
    setSessionCompleted(false);
    setShowSessionFeedback(false);
    setFeedbackRating(null);
    setFeedbackText('');
    setFeedbackError('');
    setSavedRating(null);
    setMessages([]);
    onConversationIdChange(null);
    inputRef.current?.focus();
  };

  const parseSources = (
    sourceData: unknown
  ): Array<{ title: string; url?: string; page?: string }> | undefined => {
    if (!sourceData) return undefined;

    const sanitize = (src: Record<string, unknown> | string) => {
      if (typeof src === 'string') {
        return { title: src, page: src.includes('Page') ? src : undefined };
      }
      const url = typeof src.url === 'string' ? src.url : typeof src.link === 'string' ? src.link : undefined;
      return {
        title: String(src.title || src.name || src.page || ''),
        url: url && isSafeHttpUrl(url) ? url : undefined,
        page: typeof src.page === 'string' ? src.page : typeof src.pageNumber === 'string' ? src.pageNumber : undefined,
      };
    };

    if (Array.isArray(sourceData)) {
      return sourceData.map((src) =>
        sanitize(typeof src === 'object' && src ? (src as Record<string, unknown>) : String(src))
      );
    }

    if (typeof sourceData === 'object') {
      return [sanitize(sourceData as Record<string, unknown>)];
    }

    if (typeof sourceData === 'string') {
      const parts = sourceData.split(/[""]/).filter((p) => p.trim());
      if (parts.length > 0) return parts.map((part) => ({ title: part.trim() }));
      return [{ title: sourceData }];
    }

    return undefined;
  };

  const playAssistantTts = async (message: Message) => {
    if (isTaskMode || !message.content.trim() || sessionCompleted) return;
    await playTts(message.id, message.content);
  };

  const sendMessageWithText = async (
    text: string,
    options?: { optionId?: string }
  ) => {
    if (!text.trim() || isLoading || sessionCompleted) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => {
      // Clear prior clarification/suggestion chips once the user continues
      const cleared = prev.map((m) =>
        m.role === 'assistant'
          ? { ...m, clarificationOptions: undefined, suggestions: undefined }
          : m
      );
      const next = [...cleared, userMessage];
      if (conversationId && !isTaskMode) persistMessages(conversationId, next);
      return next;
    });
    setInputMessage('');
    setIsLoading(true);

    try {
      if (isTaskMode && !taskConfigured) {
        throw new Error('Task API key is not configured. Add TASK_API_KEY to .env.local.');
      }
      if (!isTaskMode && !chatConfigured) {
        throw new Error('API key is not configured for this assistant. Check CHAT_API_KEY in .env.local.');
      }

      if (isTaskMode && !user?.visitorId && !visitorId) {
        throw new Error('Task mode requires login — external_user_id is mandatory.');
      }

      const includeExternalUserId = isTaskMode || apiTestOptions.includeExternalUserId;
      const includeConversationMemory = !isTaskMode && apiTestOptions.includeConversationMemory;

      // With external_user_id, omit conversation_id to resume the active thread.
      // Only send new_conversation when the user explicitly taps New Chat.
      const conversationFields = !includeConversationMemory
        ? {}
        : forceNewConversation
          ? { new_conversation: true as const }
          : conversationId
            ? { conversation_id: conversationId }
            : {};

      // Keep JSON path when API test debug is on; otherwise stream deltas
      const useStream = !isTaskMode && !onRequestLogged;

      const proxyBody = {
        message: userMessage.content,
        assistantId,
        assistantMode,
        stream: useStream,
        ...(includeExternalUserId ? { external_user_id: user?.visitorId || visitorId } : {}),
        ...(apiTestOptions.includeExternalUserName && user?.name?.trim()
          ? { external_user_name: user.name.trim() }
          : {}),
        ...(apiTestOptions.includeExternalUserEmail && user?.email?.trim()
          ? { external_user_email: user.email.trim() }
          : {}),
        ...(apiTestOptions.includeChatLanguage ? { language } : {}),
        ...conversationFields,
        ...(options?.optionId ? { option_id: options.optionId } : {}),
        ...(shareLink?.trim() ? { assistant: shareLink.trim() } : {}),
        apiTestOptions,
        includeTestDebug: !!onRequestLogged,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyBody),
      });

      if (forceNewConversation) onForceNewConversationConsumed?.();

      if (!response.ok) {
        let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        let errorCode = '';

        try {
          const errorPayload = await response.json();
          const { debug, data: errorRaw } = extractTestDebug(errorPayload);
          const errorData = (errorRaw ?? errorPayload ?? {}) as Record<string, unknown>;
          if (debug) onRequestLogged?.(debug);

          errorCode = String(errorData.code || '');
          if (errorCode === 'CONVERSATION_NOT_ACTIVE' || response.status === 409) {
            setSessionCompleted(true);
            await markConversationCompleted();
            throw new Error('Bu söhbət artıq tamamlanıb. Yeni söhbət başladın.');
          }

          if (typeof errorData.error === 'string') errorDetails = errorData.error;
          else if (typeof errorData.message === 'string') errorDetails = errorData.message;
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message.includes('tamamlanıb')) throw parseErr;
        }

        const error = new Error(errorDetails);
        (error as Error & { code?: string }).code = errorCode;
        throw error;
      }

      let data: Record<string, any> = {};
      const contentType = response.headers.get('content-type');

      if (useStream && isSseContentType(contentType)) {
        const streamingId = `stream-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: streamingId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
          },
        ]);

        const finalPayload = await consumeChatSse(response, {
          onDelta: (delta) => {
            if (!delta) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId ? { ...m, content: m.content + delta } : m
              )
            );
          },
        });

        data =
          finalPayload && typeof finalPayload === 'object'
            ? (finalPayload as Record<string, any>)
            : { success: true, data: finalPayload };

        // Normalize: final event may be { success, data } or the data object itself
        if (data.success == null && (data.response || data.conversation_id || data.response_type)) {
          data = { success: true, data };
        }
      } else {
        const rawPayload = await response.json();
        const { debug, data: rawData } = extractTestDebug(rawPayload);
        data = (rawData ?? rawPayload ?? {}) as Record<string, any>;
        if (debug) onRequestLogged?.(debug);
      }

      if (data.success === false) {
        const errorCode = data.code || 'API_ERROR';
        let userFriendlyMessage = data.error || data.message || 'Unknown error';
        if (errorCode === 'CONVERSATION_NOT_ACTIVE') {
          setSessionCompleted(true);
          await markConversationCompleted();
          userFriendlyMessage = 'Bu söhbət artıq tamamlanıb. Yeni söhbət başladın.';
        } else if (errorCode === 'MISSING_AUTH' || errorCode === 'INVALID_API_KEY') {
          userFriendlyMessage = 'API açarı yanlışdır və ya təyin edilməyib.';
        } else if (errorCode === 'ASSISTANT_NOT_CONFIGURED') {
          userFriendlyMessage = 'Bu köməkçi üçün server API açarı təyin edilməyib.';
        } else if (errorCode === 'RATE_LIMIT_EXCEEDED') {
          userFriendlyMessage = 'Sürət limiti aşılıb. Zəhmət olmasa bir az gözləyin.';
        }
        throw new Error(userFriendlyMessage);
      }

      const parsed = parseChatSuccessData(data);
      const responseText = parsed.responseText;
      const sources = parseSources(parsed.sources);
      const returnedConversationId = parsed.conversationId;
      const activeConversationId = returnedConversationId || conversationId;

      if (returnedConversationId && returnedConversationId !== conversationId) {
        onConversationIdChange(returnedConversationId);
      }
      if (activeConversationId) {
        persistConversation(activeConversationId, userMessage.content);
      }

      const taskCommand = isTaskMode ? parseTaskCommandFromResponse(data) : null;
      const displayContent = resolveTaskDisplayContent(responseText, taskCommand);
      const hasClarification =
        parsed.responseType === 'clarification' || parsed.clarificationOptions.length > 0;
      const hasSuggestions = parsed.suggestions.length > 0;

      if (displayContent || taskCommand || hasClarification || hasSuggestions) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            displayContent ||
            responseText.trim() ||
            (hasClarification ? 'Zəhmət olmasa bir seçim edin:' : ''),
          timestamp: new Date(),
          sources,
          taskCommand: taskCommand ?? undefined,
          responseType: parsed.responseType,
          clarificationOptions: hasClarification ? parsed.clarificationOptions : undefined,
          suggestions: hasSuggestions ? parsed.suggestions : undefined,
        };

        setMessages((prev) => {
          // Replace streaming placeholder if present
          const withoutStream = prev.filter((m) => !m.id.startsWith('stream-'));
          const next = [...withoutStream, assistantMessage];
          if (activeConversationId && !isTaskMode) persistMessages(activeConversationId, next);
          return next;
        });
      } else if (data.success !== true) {
        throw new Error(data.error || 'No response received from API');
      }
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      let errorMessageText = 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.';
      if (err?.message) {
        if (err.message.includes('API key') || err.message.includes('CHAT_API_KEY')) {
          errorMessageText = 'Server API açarı təyin edilməyib. .env.local faylını yoxlayın.';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessageText = 'Serverə bağlanıla bilmədi. İnternet bağlantınızı yoxlayın.';
        } else {
          errorMessageText = err.message;
        }
      }

      setMessages((prev) => [
        ...prev.filter((m) => !m.id.startsWith('stream-')),
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errorMessageText,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClarificationOption = (option: ClarificationOption) => {
    void sendMessageWithText(option.label, { optionId: option.id });
  };

  const handleSuggestion = (suggestion: ChatSuggestion) => {
    void sendMessageWithText(suggestion.message);
  };

  const sendMessage = () => {
    void sendMessageWithText(inputMessage);
  };

  const handleTaskQuickAction = (message: string, fillInput?: boolean) => {
    if (fillInput) {
      setInputMessage(message);
      inputRef.current?.focus();
      return;
    }
    void sendMessageWithText(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [inputMessage]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-slate-900">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">
                {isTaskMode ? 'Task rejimi' : 'Söhbətə başlayın'}
              </h3>
              <p className="text-slate-400 max-w-sm mx-auto">
                {isTaskMode
                  ? 'Slash əmrləri (/help, /taskinfo) və ya təbii dil. Task rejimində eyni external_user_id istifadə olunur.'
                  : `Sualınızı yazın və ${assistantName} cavab versin`}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isTaskCommandUi = message.role === 'assistant' && !!message.taskCommand;
              const isTableMessage =
                message.role === 'assistant' &&
                messageHasTable(message.content) &&
                !isTaskCommandUi;

              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} message-enter`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={`rounded-2xl px-5 py-3.5 shadow-lg ${
                      message.role === 'user'
                        ? 'max-w-[80%] bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
                        : isTableMessage || isTaskCommandUi
                          ? 'w-full max-w-full bg-slate-800/90 backdrop-blur text-slate-100 border border-slate-700/50'
                          : isTaskMode && message.role === 'assistant'
                            ? 'max-w-[92%] bg-slate-800/90 backdrop-blur text-slate-100 border border-amber-900/30'
                            : 'max-w-[85%] bg-slate-800/90 backdrop-blur text-slate-100 border border-slate-700/50'
                    } transition-all duration-200 hover:shadow-xl ${
                      isTaskCommandUi ? 'border-amber-900/30' : ''
                    }`}
                  >
                    {isTaskCommandUi && message.taskCommand ? (
                      <TaskCommandView
                        command={message.taskCommand}
                        fallbackText={message.content || undefined}
                        onPrefillMessage={handlePrefillTaskCommand}
                      />
                    ) : (
                      <ChatMessageContent content={message.content} variant={message.role} />
                    )}

                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <p className="text-xs text-slate-400 mb-2 font-semibold">Mənbələr:</p>
                        <div className="space-y-1">
                          {message.sources.map((source, idx) => (
                            <div key={idx} className="text-xs text-slate-300">
                              {source.title && <span className="font-medium">{source.title}</span>}
                              {source.page && (
                                <span className="text-slate-400 ml-1">({source.page})</span>
                              )}
                              {source.url && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-400 hover:text-indigo-300 ml-2 underline"
                                >
                                  Link
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.clarificationOptions &&
                      message.clarificationOptions.length > 0 &&
                      !sessionCompleted && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                          <p className="text-xs text-slate-400 font-semibold">
                            Seçim edin (clarification)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.clarificationOptions.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleClarificationOption(option)}
                                className="rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 text-xs text-indigo-200 hover:bg-indigo-900/50 disabled:opacity-50"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    {message.suggestions &&
                      message.suggestions.length > 0 &&
                      !sessionCompleted && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                          <p className="text-xs text-slate-400 font-semibold">Təkliflər</p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, idx) => (
                              <button
                                key={`${suggestion.message}-${idx}`}
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleSuggestion(suggestion)}
                                className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-900/40 disabled:opacity-50"
                              >
                                {suggestion.label || suggestion.message}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    <div
                      className={`mt-2 flex items-center gap-2 ${
                        message.role === 'user' ? 'justify-end' : 'justify-between'
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          message.role === 'user' ? 'text-indigo-100/80' : 'text-slate-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString('az-AZ', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {message.role === 'assistant' &&
                        message.content.trim() &&
                        !isTaskMode && (
                          <button
                            type="button"
                            onClick={() => void playAssistantTts(message)}
                            disabled={ttsLoadingId === message.id || sessionCompleted}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/80 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-50"
                            title={`Səsli oxu (${language})`}
                          >
                            {ttsLoadingId === message.id ? (
                              <>
                                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Yüklənir
                              </>
                            ) : ttsPlayingId === message.id ? (
                              <>
                                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                                </svg>
                                Dayandır
                              </>
                            ) : (
                              <>
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0-12a3 3 0 000 6m0 0a3 3 0 000 6m-7-6h1m14 0h1" />
                                </svg>
                                Dinlə
                              </>
                            )}
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-slate-800 p-4 bg-slate-950/50">
        {sessionCompleted && (
          <div className="mb-3 rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-emerald-300">
              Söhbət tamamlandı
              {savedRating != null ? ` · qiymət: ${savedRating}/5` : ''}.
            </p>
            <button
              type="button"
              onClick={handleStartNewAfterFeedback}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Yeni söhbət
            </button>
          </div>
        )}

        {showSessionFeedback && conversationId && !sessionCompleted && !isTaskMode && (
          <div className="mb-3 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-4 space-y-3">
            <p className="text-sm font-medium text-slate-200">Söhbəti qiymətləndirin</p>
            <p className="text-xs text-slate-500">Bu, sessiyanı bitirir və köməkçiyə ümumi rəy verir.</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className={`text-xl transition ${
                    feedbackRating != null && star <= feedbackRating
                      ? 'text-amber-400'
                      : 'text-slate-600 hover:text-slate-400'
                  }`}
                  aria-label={`${star} ulduz`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Əlavə rəy (istəyə bağlı)..."
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            {feedbackError && <p className="text-xs text-red-400">{feedbackError}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSubmittingFeedback}
                onClick={() => void submitSessionFeedback(false)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSubmittingFeedback ? 'Göndərilir...' : 'Göndər və bitir'}
              </button>
              <button
                type="button"
                disabled={isSubmittingFeedback}
                onClick={() => void submitSessionFeedback(true)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Qiymətləndirmədən bitir
              </button>
              <button
                type="button"
                disabled={isSubmittingFeedback}
                onClick={() => {
                  setShowSessionFeedback(false);
                  setFeedbackError('');
                }}
                className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-300"
              >
                Ləğv et
              </button>
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
          <label htmlFor="chat-language" className="text-sm text-slate-400 shrink-0">
            Cavab dili
          </label>
          <div className="flex items-center gap-2">
            {!isTaskMode && (conversationId || messages.length > 0) && !sessionCompleted && (
              <button
                type="button"
                onClick={handleCloseConversation}
                disabled={isLoading}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
                title="Cari söhbəti bağla və yenisini başlat"
              >
                Bağla
              </button>
            )}
            {conversationId &&
              messages.length > 0 &&
              !sessionCompleted &&
              !showSessionFeedback &&
              !isTaskMode && (
                <button
                  type="button"
                  onClick={() => setShowSessionFeedback(true)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Söhbəti bitir
                </button>
              )}
            <select
              id="chat-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as ChatLanguage)}
              disabled={isLoading || sessionCompleted}
              className="bg-slate-800/90 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 disabled:opacity-50"
            >
              {CHAT_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {isTaskMode && (
          <div className="mb-3">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Slash commands
            </p>
            <div className="flex flex-wrap gap-2">
              {TASK_QUICK_COMMANDS.map((cmd) => (
                <button
                  key={cmd.label}
                  type="button"
                  title={cmd.hint}
                  disabled={isLoading}
                  onClick={() => handleTaskQuickAction(cmd.message, cmd.fillInput)}
                  className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-900/40 disabled:opacity-50"
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {(ttsError || sttError) && !isTaskMode && (
          <p className="mb-2 text-xs text-red-400">{ttsError || sttError}</p>
        )}
        <div className="flex gap-3 items-end min-w-0">
          <div className="flex-1 relative min-w-0">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isTaskMode
                  ? '/help, /newtask billing …, /taskstatus 1042, və ya təbii dil'
                  : 'Mesajınızı yazın...'
              }
              className="w-full bg-slate-800/90 backdrop-blur border border-slate-700/50 rounded-xl px-5 py-4 pr-14 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all duration-200"
              rows={1}
              style={{ minHeight: '52px', maxHeight: '120px' }}
              disabled={isLoading || sessionCompleted || isTranscribing}
            />
          </div>
          {!isTaskMode && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isLoading || sessionCompleted || isTranscribing}
              title={
                isRecording
                  ? 'Stop recording'
                  : isTranscribing
                    ? 'Transcribing…'
                    : 'Speak (fills message box, does not send)'
              }
              className={`rounded-xl border px-4 py-4 text-sm transition disabled:opacity-50 ${
                isRecording
                  ? 'border-rose-500 bg-rose-600/20 text-rose-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isTranscribing ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0m5 5v3m-3 0h6"
                  />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || sessionCompleted || isTranscribing}
            className="px-7 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center shadow-lg hover:shadow-xl disabled:hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Göndərilir...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Göndər</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
