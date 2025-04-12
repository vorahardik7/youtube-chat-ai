// FILE: src/app/components/ChatMessage.tsx
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md ring-2 ring-teal-100">
              <Bot size={20} className="text-white" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shadow-md ring-2 ring-slate-100">
              <UserCircle size={22} className="text-slate-600" />
            </div>
          )}
        </div>

        {/* Message Bubble */}
        <div className="min-w-0 flex-1"> {/* For proper shrinking/wrapping */}
          <div className="flex items-center gap-3 mb-1.5 flex-wrap"> 
            <span className={`font-semibold text-sm ${isAi ? 'text-teal-700' : 'text-slate-700'}`}>
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
            className={`p-4 rounded-2xl ${isAi 
              ? 'bg-white border border-slate-200 text-slate-700 shadow-sm'
              : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md'
            }`}
          >
            {/* Render children passed from VideoPage */}
            <div className={`text-sm break-words leading-relaxed ${isAi 
              ? 'prose prose-slate prose-headings:text-teal-800 prose-headings:font-bold prose-strong:font-bold prose-li:my-0.5 prose-p:my-1.5' 
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
    <div className="flex gap-4 mb-6 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-slate-200 shadow-sm"></div>
      <div className="flex-1">
        <div className="h-4 bg-slate-200 rounded-full w-28 mb-3"></div>
        <div className="h-24 bg-slate-100 rounded-2xl w-[90%] shadow-sm border border-slate-200"></div>
      </div>
    </div>
  );
}