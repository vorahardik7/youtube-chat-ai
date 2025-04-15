'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clock, Send, Sparkles, ChevronDown } from 'lucide-react';
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
    } catch {
      // Not JSON, proceed to Markdown rendering
    }

    // --- Store matches with original text index ---
    interface TimeMatch {
      index: number; // Position in the original string
      fullMatch: string; // "[MM:SS]"
      timeValue: string; // "MM:SS"
    }
    
    // Regex for both [MM:SS] and TIMESTAMP_X formats
    const mmssRegex = /\[(\d{1,2}:\d{2})\]/g;
    const timestampXRegex = /TIMESTAMP_(\d+)/g;
    const timeMatches: TimeMatch[] = [];
    let match;
    
    // Find all "[MM:SS]" matches in the original text
    while ((match = mmssRegex.exec(text)) !== null) {
      timeMatches.push({
        index: match.index,
        fullMatch: match[0],
        timeValue: match[1],
      });
    }
    
    // Find all "TIMESTAMP_X" matches and convert them to MM:SS format
    while ((match = timestampXRegex.exec(text)) !== null) {
      const seconds = parseInt(match[1], 10);
      if (!isNaN(seconds)) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeValue = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        timeMatches.push({
          index: match.index,
          fullMatch: match[0],
          timeValue: timeValue,
        });
      }
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
    // Import necessary types
    type ComponentPropsWithChildren = { children: React.ReactNode };
    
    const components: Record<string, React.ComponentType<ComponentPropsWithChildren>> = {
      // Process paragraphs to look for timestamps within their text content
      p: ({ children, ...props }: ComponentPropsWithChildren) => {
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
      h2: ({ children }: ComponentPropsWithChildren) => (
        <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
      ),
      // Style lists appropriately
      ul: ({ children }: ComponentPropsWithChildren) => (
        <ul className="list-disc my-2 pl-5">{children}</ul>
      ),
      ol: ({ children }: ComponentPropsWithChildren) => (
        <ol className="list-decimal my-2 pl-5">{children}</ol>
      ),
      li: ({ children }: ComponentPropsWithChildren) => (
        <li className="ml-1">{children}</li>
      ),
      // Style code blocks
      code: ({ inline, children }: ComponentPropsWithChildren & { inline?: boolean }) => (
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
    <div className="flex flex-col h-full border-l border-slate-200 overflow-hidden bg-white">
      {/* Chat Header */}
      <div className="p-4 md:p-5 border-b border-slate-200 bg-white flex-shrink-0 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-sm text-slate-500 mt-1.5">Ask questions or reference specific moments with [MM:SS] timestamps</p>
        </div>
        <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
          <Clock size={12} className="text-blue-600" />
          <span>{playerReady ? formatTime(currentTimestamp) : '--:--'}</span>
        </div>
      </div>

      {/* Messages Area - Flexible height with scrolling */}
      <div 
        ref={chatContainerRef} 
        className="flex-1 overflow-y-auto p-4 md:p-6 bg-white scrollbar-thin"
      >
        <div className="flex flex-col space-y-6 max-w-4xl mx-auto">
          {/* Only show initial loading skeleton when there are no messages */}
          {isLoading && messages.length === 0 && (
            <div className="px-2">
              <ChatMessageSkeleton />
            </div>
          )}
          
          {!isLoading && messages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-5 shadow-sm">
                <Sparkles size={28} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Start a Conversation</h3>
              <p className="text-slate-600 max-w-md">Ask any question about this video and get intelligent responses based on the content.</p>
              <div className="mt-6 flex flex-col gap-3 w-full max-w-md">
                <button 
                  onClick={() => onSendMessage("What are the main points covered in this video?")}
                  className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left flex items-center shadow-sm"
                >
                  <ChevronDown size={16} className="mr-2 text-blue-500" />
                  What are the main points covered in this video?
                </button>
                <button 
                  onClick={() => onSendMessage("Can you summarize this video in 3 bullet points?")}
                  className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors text-left flex items-center shadow-sm"
                >
                  <ChevronDown size={16} className="mr-2 text-blue-500" />
                  Can you summarize this video in 3 bullet points?
                </button>
              </div>
            </div>
          )}
          
          {!isLoading && error && messages.length === 0 && !videoDetails && (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 bg-white rounded-xl shadow-sm border border-red-100">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5 shadow-sm">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Error Loading Video</h3>
              <p className="text-slate-600 mb-4 max-w-md">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-medium transition-colors shadow-sm"
              >
                Try Again
              </button>
            </div>
          )}
          
          {messages.map(message => (
            <ChatMessage
              key={message.id}
              user={message.user}
              isAi={message.isAi}
              timestamp={message.timestamp ? formatTime(message.timestamp) : undefined}
            >
              {message.isStreaming ? (
                <div className="flex flex-col gap-2">
                  {message.text ? (
                    <div className="streaming-text">{renderMessageText(message.text)}</div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="typing-animation">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="text-xs text-slate-500">AI is typing...</span>
                    </div>
                  )}
                </div>
              ) : (
                renderMessageText(message.text)
              )}
            </ChatMessage>
          ))}
          {/* Only show AI thinking skeleton when there are no streaming messages */}
          {isAiThinking && !isLoading && !messages.some(msg => msg.isStreaming) && (
            <div className="opacity-100">
              <ChatMessageSkeleton />
            </div>
          )}
          <div ref={messagesEndRef} className="h-1"/> {/* Scroll anchor */}
        </div>
      </div>

      {/* Message Input Area */}
      <div className="p-4 md:p-5 border-t border-slate-200 bg-white flex-shrink-0 shadow-md">
        <form onSubmit={handleSubmit} className="flex gap-3 items-center max-w-3xl mx-auto">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={isAiThinking ? "AI is generating a response..." : "Ask a question about the video..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isLoading || !playerReady || isAiThinking}
              className="w-full rounded-lg border border-slate-300 px-5 py-3 pr-12 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed shadow-sm"
              aria-label="Chat message input"
            />
            {/* Insert Timestamp Button */}
            <button
              type="button"
              title="Insert Current Timestamp"
              onClick={() => setNewMessage(prev => `${prev} [${formatTime(currentTimestamp)}]`)}
              disabled={isLoading || !playerReady || isAiThinking}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Insert current video time"
            >
              <Clock size={18} />
            </button>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isLoading || !playerReady || isAiThinking}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-5 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md"
            aria-label="Send message"
          >
            {isAiThinking ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="small" color="white" />
                <span className="hidden sm:inline">Thinking...</span>
              </div>
            ) : (
              <>
                <Send size={18} />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}