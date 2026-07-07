'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessageContent, { messageHasTable } from './ChatMessageContent';
import {
  ChatUser,
  fromStoredMessage,
  loadStoredMessages,
  saveStoredMessages,
  toStoredMessage,
  upsertConversationSummary,
} from '@/lib/chatSession';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{ title: string; url?: string; page?: string }>;
  feedback?: 'up' | 'down';
}

const CHAT_LANGUAGES = [
  { value: 'az', label: 'Azərbaycan' },
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'ru', label: 'Русский' },
] as const;

type ChatLanguage = (typeof CHAT_LANGUAGES)[number]['value'];

interface ChatInterfaceProps {
  assistantId: string;
  /** PersonaAI share_link — only sent when set; API key alone can identify the assistant */
  shareLink?: string;
  assistantName: string;
  apiKey: string;
  apiId: string;
  defaultLanguage?: ChatLanguage;
  user: ChatUser | null;
  conversationId: string | null;
  onConversationIdChange: (conversationId: string | null) => void;
  onClose: () => void;
}

export default function ChatInterface({
  assistantId,
  shareLink,
  assistantName,
  apiKey,
  apiId,
  defaultLanguage = 'az',
  user,
  conversationId,
  onConversationIdChange,
  onClose,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [language, setLanguage] = useState<ChatLanguage>(defaultLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackPendingId, setFeedbackPendingId] = useState<string | null>(null);
  const visitorId = user?.visitorId || `guest-${apiId}-${Date.now()}`;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      const cached = loadStoredMessages(conversationId).map(fromStoredMessage);
      if (cached.length > 0) setMessages(cached);

      if (!apiKey) return;

      try {
        const params = new URLSearchParams({ apiKey });
        const res = await fetch(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages?${params}`);
        const data = await res.json();
        const raw = data.data?.messages || data.data || [];
        if (Array.isArray(raw) && raw.length > 0) {
          const loaded: Message[] = raw.map((item: Record<string, string>, index: number) => ({
            id: item.id || `remote-${index}`,
            role: (item.role === 'assistant' ? 'assistant' : 'user') as Message['role'],
            content: item.content || item.message || item.text || '',
            timestamp: new Date(item.created_at || item.timestamp || Date.now()),
            sources: undefined,
          }));
          setMessages(loaded);
          saveStoredMessages(conversationId, loaded.map(toStoredMessage));
        }
      } catch {
        // keep cache
      }
    };

    loadHistory();
  }, [conversationId, apiKey, assistantId]);

  const persistConversation = (id: string, preview: string) => {
    upsertConversationSummary({
      id,
      title: preview.slice(0, 48) || 'Söhbət',
      preview: preview.slice(0, 120),
      updatedAt: new Date().toISOString(),
      assistantId,
    });
  };

  const persistMessages = (id: string, nextMessages: Message[]) => {
    saveStoredMessages(id, nextMessages.map(toStoredMessage));
  };

  const submitFeedback = async (message: Message, rating: 'up' | 'down') => {
    if (!conversationId) return;
    setFeedbackPendingId(message.id);

    setMessages((prev) => {
      const next = prev.map((m) => (m.id === message.id ? { ...m, feedback: rating } : m));
      persistMessages(conversationId, next);
      return next;
    });

    try {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          conversation_id: conversationId,
          message_id: message.id,
          rating: rating === 'up' ? 5 : 1,
        }),
      });
    } catch {
      // saved locally on message either way
    } finally {
      setFeedbackPendingId(null);
    }
  };

  // Helper function to parse sources from different formats
  const parseSources = (sourceData: any): Array<{ title: string; url?: string; page?: string }> | undefined => {
    if (!sourceData) return undefined;
    
    // If it's already an array of objects
    if (Array.isArray(sourceData)) {
      return sourceData.map((src: any) => {
        if (typeof src === 'string') {
          // Handle string format like "Page 1Giriş" or "Giriş"
          return { title: src, page: src.includes('Page') ? src : undefined };
        }
        return {
          title: src.title || src.name || src.page || '',
          url: src.url || src.link,
          page: src.page || src.pageNumber
        };
      });
    }
    
    // If it's a single object
    if (typeof sourceData === 'object') {
      return [{
        title: sourceData.title || sourceData.name || sourceData.page || '',
        url: sourceData.url || sourceData.link,
        page: sourceData.page || sourceData.pageNumber
      }];
    }
    
    // If it's a string, try to parse it
    if (typeof sourceData === 'string') {
      // Try to extract structured data from string
      const parts = sourceData.split(/[""]/).filter(p => p.trim());
      if (parts.length > 0) {
        return parts.map(part => ({ title: part.trim() }));
      }
      return [{ title: sourceData }];
    }
    
    return undefined;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => {
      const next = [...prev, userMessage];
      if (conversationId) persistMessages(conversationId, next);
      return next;
    });
    setInputMessage('');
    setIsLoading(true);

    try {
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('API key is not configured for this assistant. Please check your .env.local file.');
      }

      // Use Next.js API route to proxy the request and avoid CORS issues
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          ...(shareLink?.trim() ? { assistant: shareLink.trim() } : {}),
          visitor_id: visitorId,
          language,
          conversation_id: conversationId || undefined,
          user_name: user?.name,
          user_email: user?.email,
          apiKey: apiKey.trim()
        })
      });


      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        let errorCode = '';
        
        try {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          
          // Handle different error formats
          if (typeof errorData === 'string') {
            // Try to parse if it's a JSON string
            try {
              const parsed = JSON.parse(errorData);
              errorCode = parsed.code || '';
              errorDetails = parsed.message || parsed.error || errorData;
            } catch {
              errorDetails = errorData;
            }
          } else if (errorData.code && errorData.message) {
            // Format: { code: "500", message: "..." }
            errorCode = errorData.code;
            errorDetails = errorData.message;
          } else if (errorData.success === false) {
            // API documentation format: { success: false, error: "...", code: "..." }
            errorCode = errorData.code || '';
            errorDetails = errorData.error || errorData.message || 'Unknown error';
          } else if (errorData.error) {
            errorDetails = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
            errorCode = errorData.code || '';
          } else if (errorData.message) {
            errorDetails = errorData.message;
            errorCode = errorData.code || '';
          } else {
            // Convert object to readable string
            errorDetails = JSON.stringify(errorData, null, 2);
          }
        } catch (e) {
          // Try to get as text
          try {
            const errorText = await response.text();
            console.error('API Error Text:', errorText);
            
            // Try to parse JSON string
            try {
              const parsed = JSON.parse(errorText);
              errorCode = parsed.code || '';
              errorDetails = parsed.message || parsed.error || errorText;
            } catch {
              errorDetails = errorText || errorDetails;
            }
          } catch {
            // Use default
          }
        }
        
        // Create error with code for better handling
        const error = new Error(errorDetails);
        (error as any).code = errorCode;
        throw error;
      }

      const data = await response.json();

      // Log full response for debugging
      console.log('Full API Response:', JSON.stringify(data, null, 2));

      // Handle response according to API documentation format:
      // Success: { success: true, data: { response: "...", ... } }
      // Error: { success: false, error: "...", code: "..." }
      
      let responseText = '';
      let sources: Array<{ title: string; url?: string; page?: string }> | undefined = undefined;

      // Check if response follows the documented format
      if (data.success === true && data.data) {
        responseText = data.data.response || data.data.message || data.data.text || '';
        sources = parseSources(data.data.sources || data.data.source);

        const returnedConversationId = data.data.conversation_id as string | undefined;
        const activeConversationId = returnedConversationId || conversationId;

        if (returnedConversationId && returnedConversationId !== conversationId) {
          onConversationIdChange(returnedConversationId);
        }

        if (activeConversationId) {
          persistConversation(activeConversationId, userMessage.content);
        }
        
        if (data.data.usage) {
          console.log('API Usage:', data.data.usage);
        }
      } else if (data.success === false) {
        // Error response format from API
        const errorCode = data.code || 'API_ERROR';
        const errorMessage = data.error || data.message || 'Unknown error';
        const errorDetails = data.details?.message || '';
        
        console.error('API Error Response:', {
          code: errorCode,
          error: errorMessage,
          details: errorDetails
        });
        
        // Handle specific error codes from documentation
        let userFriendlyMessage = errorMessage;
        if (errorCode === 'MISSING_AUTH' || errorCode === 'INVALID_API_KEY') {
          userFriendlyMessage = 'API açarı yanlışdır və ya təyin edilməyib.';
        } else if (errorCode === 'UNAUTHORIZED') {
          userFriendlyMessage = 'API açarı bu köməkçi üçün icazə verilmir.';
        } else if (errorCode === 'ASSISTANT_NOT_FOUND') {
          userFriendlyMessage = 'Köməkçi tapılmadı. API açarını və köməkçi konfiqurasiyasını yoxlayın.';
        } else if (errorCode === 'MISSING_FIELDS') {
          userFriendlyMessage = 'Tələb olunan sahələr çatışmır.';
        } else if (errorCode === 'RATE_LIMIT_EXCEEDED') {
          userFriendlyMessage = 'Sürət limiti aşılıb. Zəhmət olmasa bir az gözləyin.';
        }
        
        throw new Error(userFriendlyMessage);
      } else {
        // Legacy format or unknown format - try to extract response
        if (Array.isArray(data)) {
          // Array format - filter out errors
          const validMessages = data.filter((msg: any) => {
            const text = msg.response || msg.message || msg.text || msg.content || msg.answer || '';
            const errorPhrases = [
              'I apologize, but I\'m having trouble processing your request',
              'trouble processing your request',
              'please try again',
              'error occurred'
            ];
            return text && !errorPhrases.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()));
          });
          
          if (validMessages.length > 0) {
            responseText = validMessages[0].response || validMessages[0].message || validMessages[0].text || '';
            sources = parseSources(validMessages[0].sources || validMessages[0].source);
          }
        } else {
          // Single object - try common fields
          responseText = data.response || data.message || data.text || data.content || data.answer || '';
          sources = parseSources(data.sources || data.source);
          
          // Filter out error messages in text
          const errorPhrases = [
            'I apologize, but I\'m having trouble processing your request right now. Please try again.',
            'I apologize, but I\'m having trouble processing your request',
            'trouble processing your request right now'
          ];
          
          if (errorPhrases.some(phrase => responseText.includes(phrase))) {
            const errorIndex = responseText.indexOf('I apologize');
            if (errorIndex > 0) {
              responseText = responseText.substring(0, errorIndex).trim();
            }
          }
        }
      }

      // Only add message if we have actual content
      if (responseText && responseText.trim().length > 0) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText.trim(),
          timestamp: new Date(),
          sources: sources
        };

        setMessages(prev => {
          const next = [...prev, assistantMessage];
          const activeId = (data.success === true && data.data?.conversation_id) || conversationId;
          if (activeId) persistMessages(activeId, next);
          return next;
        });
      } else if (!data.success) {
        // If it was an error response but no text extracted, show the error
        throw new Error(data.error || 'No response received from API');
      } else {
        console.warn('No valid response text found in API response:', data);
      }
    } catch (error: any) {
      console.error('Chat API Error Details:', {
        error,
        message: error?.message,
        assistantId,
        apiId,
        hasApiKey: !!apiKey
      });

      let errorMessageText = 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.';
      const errorCode = (error as any)?.code || '';
      
      if (error?.message) {
        // Parse error message if it's a JSON string
        let parsedMessage = error.message;
        let parsedCode = errorCode;
        
        // Try to parse JSON string in error message
        if (error.message.startsWith('{') || error.message.startsWith('"')) {
          try {
            const parsed = JSON.parse(error.message);
            parsedCode = parsed.code || parsedCode;
            parsedMessage = parsed.message || parsed.error || error.message;
          } catch {
            // Not JSON, use as is
          }
        }
        
        // Check for specific error codes from API documentation
        if (parsedCode === 'MISSING_AUTH' || parsedCode === 'INVALID_API_KEY') {
          errorMessageText = 'API açarı yanlışdır və ya təyin edilməyib.';
        } else if (parsedCode === 'UNAUTHORIZED' || parsedCode === '403') {
          errorMessageText = 'API açarı bu köməkçi üçün icazə verilmir.';
        } else if (parsedCode === 'ASSISTANT_NOT_FOUND' || parsedCode === '404') {
          errorMessageText = 'Köməkçi tapılmadı. API açarını və köməkçi konfiqurasiyasını yoxlayın.';
        } else if (parsedCode === 'MISSING_FIELDS' || parsedCode === '400') {
          errorMessageText = 'Tələb olunan sahələr çatışmır.';
        } else if (parsedCode === 'RATE_LIMIT_EXCEEDED' || parsedCode === '429') {
          errorMessageText = 'Sürət limiti aşılıb. Zəhmət olmasa bir az gözləyin.';
        } else if (parsedCode === '500' || error.message.includes('500') || parsedMessage.includes('server error')) {
          errorMessageText = 'Server tərəfində xəta baş verdi. Bu, xarici API serverində problem olduğunu göstərir. Zəhmət olmasa daha sonra yenidən cəhd edin və ya API serverinin loglarını yoxlayın.';
        } else if (error.message.includes('API key') || error.message.includes('MISSING_AUTH')) {
          errorMessageText = 'API açarı təyin edilməyib. Zəhmət olmasa .env.local faylını yoxlayın.';
        } else if (error.message.includes('404')) {
          errorMessageText = 'API endpoint tapılmadı. Zəhmət olmasa API URL-i yoxlayın.';
        } else if (error.message.includes('401')) {
          errorMessageText = 'API açarı yanlışdır və ya icazə yoxdur.';
        } else if (error.message.includes('FUNCTION_INVOCATION_FAILED')) {
          errorMessageText = 'Server tərəfində xəta baş verdi. Bu, xarici API serverində problem olduğunu göstərir.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessageText = 'Serverə bağlanıla bilmədi. İnternet bağlantınızı və ya server statusunu yoxlayın.';
        } else {
          // Use the parsed message directly (already translated if possible)
          errorMessageText = parsedMessage;
        }
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessageText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
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
      {/* Messages Area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Söhbətə başlayın</h3>
              <p className="text-slate-400">Sualınızı yazın və {assistantName} cavab versin</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isTableMessage = message.role === 'assistant' && messageHasTable(message.content);

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
                      : isTableMessage
                        ? 'w-full max-w-full bg-slate-800/90 backdrop-blur text-slate-100 border border-slate-700/50'
                        : 'max-w-[85%] bg-slate-800/90 backdrop-blur text-slate-100 border border-slate-700/50'
                  } transition-all duration-200 hover:shadow-xl`}
                >
                  <ChatMessageContent content={message.content} variant={message.role} />
                  
                  {/* Display sources if available */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-2 font-semibold">Mənbələr:</p>
                      <div className="space-y-1">
                        {message.sources.map((source, idx) => (
                          <div key={idx} className="text-xs text-slate-300">
                            {source.title && (
                              <span className="font-medium">{source.title}</span>
                            )}
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

                  {message.role === 'assistant' && conversationId && (
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-700/50 pt-2">
                      <span className="text-xs text-slate-500">Fikriniz:</span>
                      <button
                        type="button"
                        disabled={feedbackPendingId === message.id}
                        onClick={() => submitFeedback(message, 'up')}
                        className={`rounded-md px-2 py-1 text-xs transition ${
                          message.feedback === 'up'
                            ? 'bg-emerald-600/30 text-emerald-300'
                            : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        disabled={feedbackPendingId === message.id}
                        onClick={() => submitFeedback(message, 'down')}
                        className={`rounded-md px-2 py-1 text-xs transition ${
                          message.feedback === 'down'
                            ? 'bg-red-600/30 text-red-300'
                            : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        👎
                      </button>
                    </div>
                  )}
                  
                  <span className={`text-xs mt-2 block ${
                    message.role === 'user' ? 'text-indigo-100/80' : 'text-slate-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
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

      {/* Input Area */}
      <div className="shrink-0 border-t border-slate-800 p-4 bg-slate-950/50">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label htmlFor="chat-language" className="text-sm text-slate-400 shrink-0">
            Cavab dili
          </label>
          <select
            id="chat-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as ChatLanguage)}
            disabled={isLoading}
            className="bg-slate-800/90 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 disabled:opacity-50"
          >
            {CHAT_LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 items-end min-w-0">
          <div className="flex-1 relative min-w-0">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mesajınızı yazın..."
              className="w-full bg-slate-800/90 backdrop-blur border border-slate-700/50 rounded-xl px-5 py-4 pr-14 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all duration-200"
              rows={1}
              style={{ minHeight: '52px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
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

