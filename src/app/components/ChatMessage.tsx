'use client';
import React from 'react';
import { UserCircle, Bot, Clock } from 'lucide-react';

interface ChatMessageProps {
  user: string;
  children: React.ReactNode;
  isAi: boolean;
  timestamp?: string; // Make timestamp optional
}

export function ChatMessage({ user, children, isAi, timestamp }: ChatMessageProps) {
  return (
    <div
      className={`flex gap-4 mb-6 ${isAi ? '' : 'justify-end'}`}
    >
      <div
        className={`flex gap-4 max-w-[90%] md:max-w-[75%] ${isAi ? 'flex-row' : 'flex-row-reverse'}`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {isAi ? (
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
              <Bot size={20} className="text-white" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shadow-md border border-slate-200">
              <UserCircle size={22} className="text-slate-600" />
            </div>
          )}
        </div>
        {/* Message Bubble */}
        <div className="min-w-0 flex-1"> {/* For proper shrinking/wrapping */}
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <span className={`font-semibold text-sm ${isAi ? 'text-blue-700' : 'text-slate-700'}`}>
              {user}
            </span>
            {timestamp && (
              <div className="flex items-center text-xs text-slate-400">
                <Clock size={12} className="mr-1" />
                <span>{timestamp}</span>
              </div>
            )}
          </div>
          <div
            className={`p-4 rounded-lg ${isAi
              ? 'bg-white border border-slate-200 text-slate-700 shadow-sm'
              : 'bg-blue-600 text-white shadow-md'
            }`}
          >
            {/* Render children passed from VideoPage */}
            <div className={`text-sm break-words leading-relaxed ${isAi
              ? 'prose prose-slate prose-headings:text-blue-800 prose-headings:font-bold prose-strong:font-bold prose-li:my-0.5 prose-p:my-1.5'
              : 'prose prose-invert prose-headings:text-white/95 prose-headings:font-bold prose-strong:text-white/95 prose-li:text-white/90 prose-li:my-0.5 prose-p:my-1.5'
            }`}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Skeleton Component ---
export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-4 mb-6">
      <div className="flex gap-4 max-w-[90%] md:max-w-[75%] flex-row">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
            <Bot size={20} className="text-white" />
          </div>
        </div>
        {/* Message Bubble */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <span className="font-semibold text-sm text-blue-700">AI Assistant</span>
          </div>
          <div className="p-4 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-sm">
            <div className="flex items-center">
              <div className="typing-animation">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}