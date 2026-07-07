'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface ChatMessageContentProps {
  content: string;
  variant: 'user' | 'assistant';
}

const markdownComponents: Components = {
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

  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const messageHasTable = (content: string): boolean =>
  /^\s*\|.+\|/m.test(content) || content.includes('|---');
