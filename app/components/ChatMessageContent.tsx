'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { formatAssistantContent } from '@/lib/formatChatContent';

interface ChatMessageContentProps {
  content: string;
  variant: 'user' | 'assistant';
}

const markdownComponents: Components = {
  h3: ({ children }) => (
    <h3 className="mb-2 mt-0 text-base font-semibold text-slate-100">{children}</h3>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-lg bg-slate-950 px-3 py-2 text-xs text-emerald-200">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-slate-950/80 px-1.5 py-0.5 text-[0.8em] font-mono text-amber-200">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="chat-table-wrap">
      <table>{children}</table>
    </div>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
      {children}
    </a>
  ),
};

export default function ChatMessageContent({ content, variant }: ChatMessageContentProps) {
  if (variant === 'user') {
    return <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>;
  }

  const formatted = formatAssistantContent(content);

  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {formatted}
      </ReactMarkdown>
    </div>
  );
}

export const messageHasTable = (content: string): boolean =>
  /^\s*\|.+\|/m.test(content) || content.includes('|---');
