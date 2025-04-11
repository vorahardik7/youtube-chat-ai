'use client';

import React, { useEffect, useRef } from 'react';
import { MessageSquare, AlertTriangle, Clock, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { ChatMessage, ChatMessageSkeleton } from './ChatMessage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: number;
  user: string;
  text: string;
  timestamp: number;
  isAi: boolean;
}

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
  const [newMessage, setNewMessage] = React.useState('');

  // Auto-scroll to bottom when messages change
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
  };

  const renderMessageText = (text: string) => {
    if (!text) return <span></span>;
    
    // Check if the text is JSON
    try {
      const jsonObject = JSON.parse(text);
      return (
        <pre className="whitespace-pre-wrap overflow-x-auto bg-slate-50 p-2 rounded text-xs">
          {JSON.stringify(jsonObject, null, 2)}
        </pre>
      );
    } catch (e) {
      // Not JSON, continue with regular text processing
    }
    
    // Process timestamps to make them clickable
    const timestampRegex = /\[(\d{1,2}:\d{2})\]/g;
    
    // Split the text by timestamps but keep the timestamps as parts
    const parts = [];
    let lastIndex = 0;
    let match;
    
    // Create a copy of the text that we'll modify
    let processedText = text;
    
    // Find all timestamp matches and replace them with placeholders
    interface TimeMatch {
      placeholder: string;
      fullMatch: string;
      timeValue: string;
    }
    
    const timeMatches: TimeMatch[] = [];
    while ((match = timestampRegex.exec(text)) !== null) {
      const fullMatch = match[0]; // [MM:SS]
      const timeValue = match[1]; // MM:SS
      const placeholder = `__TIMESTAMP_${timeMatches.length}__`;
      
      // Store the timestamp information
      timeMatches.push({
        placeholder,
        fullMatch,
        timeValue
      });
      
      // Replace the timestamp with a placeholder
      processedText = processedText.replace(fullMatch, placeholder);
    }
    
    // Custom components for ReactMarkdown
    const components = {
      // Handle paragraphs that might contain our timestamp placeholders
      p: ({ children, ...props }: any) => {
        if (typeof children === 'string') {
          // This shouldn't happen with ReactMarkdown, but just in case
          return <p {...props}>{children}</p>;
        }
        
        // Process the children to replace placeholders with timestamp buttons
        const processedChildren = React.Children.map(children, (child) => {
          if (typeof child !== 'string') return child;
          
          // Check if this text contains any of our placeholders
          let result: React.ReactNode = child;
          for (const { placeholder, fullMatch, timeValue } of timeMatches) {
            if (child.includes(placeholder)) {
              // Split by the placeholder
              const parts = child.split(placeholder);
              
              // Create an array with text and timestamp buttons
              const processed: React.ReactNode[] = [];
              for (let i = 0; i < parts.length; i++) {
                if (parts[i]) processed.push(parts[i]);
                
                // Add timestamp button after each part except the last
                if (i < parts.length - 1) {
                  processed.push(
                    <button
                      key={`ts-${i}-${timeValue}`}
                      onClick={() => onTimestampClick(timeValue)}
                      className="text-blue-600 hover:text-blue-800 underline font-medium mx-0.5 px-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-300"
                      title={`Jump to ${timeValue} in video`}
                    >
                      {fullMatch}
                    </button>
                  );
                }
              }
              
              result = processed;
              break;
            }
          }
          
          return result;
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
    
    return (
      <div className="markdown-content space-y-1">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={components}
        >
          {processedText}
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
              {renderMessageText(message.text)}
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
            <Send size={16} />
            <span className="hidden sm:inline">{isAiThinking ? "Thinking..." : "Send"}</span>
          </motion.button>
        </form>
      </div>
    </div>
  );
} 