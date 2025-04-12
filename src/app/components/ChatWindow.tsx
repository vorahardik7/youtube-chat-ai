'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, AlertTriangle, Clock, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { ChatMessage, ChatMessageSkeleton } from './ChatMessage';
import { LoadingSpinner } from './LoadingSpinner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  videoDetails: { title: string } | null;
  playerReady: boolean;
  currentTimestamp: number;
  isAiThinking: boolean;
  onSendMessage: (message: string) => void;
  onTimestampClick: (timestamp: string) => void;
  formatTime: (seconds: number) => string;
}

export function ChatWindow({
  messages,
  isLoading,
  error,
  videoDetails,
  playerReady,
  currentTimestamp,
  isAiThinking,
  onSendMessage,
  onTimestampClick,
  formatTime
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !videoDetails) return;
    
    onSendMessage(trimmedMessage);
    setNewMessage('');
    setIsTyping(true);
  };

  const renderMessageText = (text: string) => {
    if (!text) return <span></span>;

    // Attempt to parse as JSON (e.g., for structured data)
    try {
      const jsonObject = JSON.parse(text);
      // Basic check if it's an object and not just a string/number parsed as JSON
      if (typeof jsonObject === 'object' && jsonObject !== null && !Array.isArray(jsonObject)) {
        return (
          <pre className="whitespace-pre-wrap overflow-x-auto bg-slate-50 p-2 rounded text-xs">
            {JSON.stringify(jsonObject, null, 2)}
          </pre>
        );
      }
      // If it's not a complex object, fall through to Markdown rendering
    } catch (e) {
      // Not JSON, proceed to Markdown rendering
    }

    // --- Store matches with original text index ---
    interface TimeMatch {
      index: number; // Position in the original string
      fullMatch: string; // "[MM:SS]"
      timeValue: string; // "MM:SS"
    }
    
    // Regex only for [MM:SS]
    const timestampRegex = /\[(\d{1,2}:\d{2})\]/g;
    const timeMatches: TimeMatch[] = [];
    let match;
    
    // Find all "[MM:SS]" matches in the original text
    while ((match = timestampRegex.exec(text)) !== null) {
      timeMatches.push({
        index: match.index,
        fullMatch: match[0],
        timeValue: match[1],
      });
    }

    // If no timestamps found, render directly (optimization)
    if (timeMatches.length === 0) {
      return (
        <div className="markdown-content space-y-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {text}
          </ReactMarkdown>
        </div>
      );
    }

    // We'll directly process timestamps in the paragraph component instead of using a separate renderer

    // Create a custom components object for ReactMarkdown
    const components = {
      // Process paragraphs to look for timestamps within their text content
      p: ({ children, ...props }: any) => {
        // Process each child node that might contain timestamps
        const processedChildren = React.Children.map(children, (child) => {
          // If not a string, return as is
          if (typeof child !== 'string') return child;
          
          const segments: React.ReactNode[] = [];
          let currentText = child;
          
          // Process each timestamp match in this text node
          for (let i = 0; i < timeMatches.length; i++) {
            const { fullMatch, timeValue } = timeMatches[i];
            const matchIndex = currentText.indexOf(fullMatch);
            
            if (matchIndex !== -1) {
              // Add text before the timestamp
              if (matchIndex > 0) {
                segments.push(currentText.substring(0, matchIndex));
              }
              
              // Add the timestamp button
              const tooltipText = `Jump to ${timeValue} in video`;
              segments.push(
                <button
                  key={`ts-${i}-${timeValue}`}
                  onClick={() => {
                    console.log(`Timestamp Clicked: ${timeValue}`);
                    onTimestampClick(timeValue);
                  }}
                  className="text-blue-600 hover:text-blue-800 underline font-medium mx-0.5 px-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-300"
                  title={tooltipText}
                  data-timestamp={timeValue}
                >
                  {fullMatch}
                </button>
              );
              
              // Update remaining text to process
              currentText = currentText.substring(matchIndex + fullMatch.length);
            }
          }
          
          // Add any remaining text
          if (currentText) {
            segments.push(currentText);
          }
          
          // Return processed segments if we found timestamps, otherwise return original text
          return segments.length > 0 ? segments : child;
        });
        
        return <p {...props}>{processedChildren}</p>;
      },
      
      // Style headings appropriately
      h2: ({ children }: any) => (
        <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
      ),
      // Style lists appropriately
      ul: ({ children }: any) => (
        <ul className="list-disc my-2 pl-5">{children}</ul>
      ),
      ol: ({ children }: any) => (
        <ol className="list-decimal my-2 pl-5">{children}</ol>
      ),
      li: ({ children }: any) => (
        <li className="ml-1">{children}</li>
      ),
      // Style code blocks
      code: ({ inline, children }: any) => (
        inline ? 
          <code className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code> :
          <pre className="bg-slate-100 p-2 rounded my-2 overflow-x-auto text-sm font-mono">{children}</pre>
      )
    };
    
    // Ensure text is a string before passing to ReactMarkdown
    const safeText = typeof text === 'string' ? text : '';
    
    return (
      <div className="markdown-content space-y-1">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={components}
        >
          {safeText}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border-l border-slate-200 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-200 bg-white flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquare size={18} className="text-teal-600" />
            <span>AI Chat Assistant</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Ask about the video, mention timestamps like [MM:SS]</p>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full">
          <Clock size={12} />
          <span>{playerReady ? formatTime(currentTimestamp) : '--:--'}</span>
        </div>
      </div>

      {/* Messages Area - Flexible height with scrolling */}
      <div 
        ref={chatContainerRef} 
        className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50 to-white scrollbar-thin"
      >
        <div className="flex flex-col">
          {isLoading && messages.length === 0 && (
            <div className="px-2">
              <ChatMessageSkeleton />
            </div>
          )}
          
          {!isLoading && messages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <MessageSquare size={20} className="text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">Start the conversation by asking a question!</p>
            </div>
          )}
          
          {!isLoading && error && messages.length === 0 && !videoDetails && (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <p className="text-red-600 text-sm">Could not initialize chat</p>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
          )}
          
          {messages.map(message => (
            <ChatMessage
              key={message.id}
              user={message.user}
              isAi={message.isAi}
            >
              {message.isStreaming ? (
                <div className="flex flex-col gap-2">
                  {message.text && renderMessageText(message.text)}
                  <div className="flex items-center gap-2 mt-1">
                    <LoadingSpinner size="small" color="slate" />
                    <span className="text-xs text-slate-500">AI is typing...</span>
                  </div>
                </div>
              ) : (
                renderMessageText(message.text)
              )}
            </ChatMessage>
          ))}
          <div ref={messagesEndRef} className="h-1"/> {/* Scroll anchor */}
        </div>
      </div>

      {/* Message Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={isAiThinking ? "AI is generating a response..." : "Ask a question about the video..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isLoading || !playerReady || isAiThinking} // Disable during AI thinking
              className="w-full rounded-md border border-slate-300 px-4 py-2.5 pr-10 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              aria-label="Chat message input"
            />
            {/* Insert Timestamp Button */}
            <button
              type="button"
              title="Insert Current Timestamp"
              onClick={() => setNewMessage(prev => `${prev} [${formatTime(currentTimestamp)}]`)}
              disabled={isLoading || !playerReady || isAiThinking}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-full disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Insert current video time"
            >
              <Clock size={16} />
            </button>
          </div>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={!newMessage.trim() || isLoading || !playerReady || isAiThinking}
            className="inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-3 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isAiThinking ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="small" color="white" />
                <span className="hidden sm:inline">Thinking...</span>
              </div>
            ) : (
              <>
                <Send size={16} />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  );
} 