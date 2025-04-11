// FILE: src/app/components/ChatMessage.tsx
'use client'; 

import React from 'react'; 
import { UserCircle, Bot } from 'lucide-react';
import { motion } from 'motion/react';

interface ChatMessageProps {
  user: string;
  children: React.ReactNode; 
  isAi: boolean;
  timestamp?: string; // Make timestamp optional
}

export function ChatMessage({ user, children, isAi }: ChatMessageProps) {
  return (
    <motion.div
      className={`flex gap-3 mb-4 ${isAi ? '' : 'justify-end'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
    >
      <div
        className={`flex gap-3 max-w-[85%] md:max-w-[80%] ${isAi ? 'flex-row' : 'flex-row-reverse'}`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {isAi ? (
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center ring-1 ring-teal-200">
              <Bot size={16} className="text-teal-600" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center ring-1 ring-slate-300">
              <UserCircle size={18} className="text-slate-600" />
            </div>
          )}
        </div>

        {/* Message Bubble */}
        <div className="min-w-0 flex-1"> {/* For proper shrinking/wrapping */}
          <div className="flex items-center gap-2 mb-1 flex-wrap"> {/* Added flex-wrap */}
            <span className={`font-medium text-sm ${isAi ? 'text-teal-700' : 'text-slate-700'}`}>
              {user}
            </span>

          </div>
          <div
            className={`p-3 rounded-lg shadow-sm ${
              isAi
                ? 'bg-white border border-slate-200 text-slate-700'
                : 'bg-teal-600 text-white'
            }`}
          >
            {/* Render children passed from VideoPage */}
            <div className={`text-sm break-words leading-relaxed ${isAi ? 'prose-headings:text-teal-800 prose-strong:font-bold prose-li:my-0 prose-p:my-1' : 'prose-headings:text-white/90 prose-strong:text-white/90 prose-li:text-white/90'}`}>
               {children}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Skeleton Component ---
export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 mb-4 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-slate-200"></div>
      <div className="flex-1">
        <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
        <div className="h-16 bg-slate-100 rounded-lg w-[85%]"></div>
      </div>
    </div>
  );
}