'use client';

import { useEffect, useRef, useState } from 'react';

interface ChatButtonProps {
  assistantId?: string;
}

export default function ChatButton({ assistantId = 'əmək-məcələsi-1760266330650' }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const clickedOutsideContainer = containerRef.current && target ? !containerRef.current.contains(target) : false;
      const clickedOutsideButton = buttonRef.current && target ? !buttonRef.current.contains(target) : false;

      if (clickedOutsideContainer && clickedOutsideButton) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-[9998]">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-16 h-16 bg-indigo-600 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center hover:bg-indigo-700 hover:scale-110 ${!isOpen ? 'animate-pulse-ring' : ''}`}
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

      {/* Chat Container - Responsive */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[9996]"
            onClick={() => setIsOpen(false)}
          />
          <div ref={containerRef} className="chat-container" aria-modal="true" role="dialog">
          <iframe 
            className="chat-iframe"
            src={`https://www.purescan.info/chat?assistant=${assistantId}`}
            allow="clipboard-write"
            title="AI Chat Assistant"
          />
          </div>
        </>
      )}
    </>
  );
}

 