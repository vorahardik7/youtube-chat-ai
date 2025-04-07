'use client';

import React, { useEffect, useRef } from 'react';
import { MessageSquare, AlertTriangle, Clock, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { ChatMessage, ChatMessageSkeleton } from './ChatMessage';

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
    
    // First process timestamps to make them clickable
    const timestampRegex = /(\[(\d{1,2}:\d{2})\])/g;
    
    // Split by timestamps first
    const timeStampParts = text.split(timestampRegex);
    
    const processedParts: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // Process timestamps
    for (let i = 0; i < timeStampParts.length; i++) {
      const part = timeStampParts[i];
      if (!part) continue;
      
      if (i % 3 === 0) {
        // This is regular text, process it for markdown
        const paragraphs = part.split('\n\n').map((paragraph, pIndex) => {
          // Handle headings (##)
          if (paragraph.startsWith('## ')) {
            return <h2 key={`h2-${currentIndex}-${pIndex}`} className="text-lg font-bold mt-3 mb-2">{paragraph.substring(3)}</h2>;
          }
          
          // Handle bullet points
          if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
            const listItems = paragraph.split('\n').map((line, lIndex) => 
              line.startsWith('- ') || line.startsWith('* ') ? 
                <li key={`li-${currentIndex}-${pIndex}-${lIndex}`} className="ml-4">{line.substring(2)}</li> : 
                null
            ).filter(Boolean);
            
            return <ul key={`ul-${currentIndex}-${pIndex}`} className="list-disc my-2">{listItems}</ul>;
          }
          
          // Process bold text (*text*)
          const boldRegex = /\*([^*]+)\*/g;
          let boldTextResult = [];
          let lastIndex = 0;
          let match;
          
          const paragraphText = paragraph.toString();
          while ((match = boldRegex.exec(paragraphText)) !== null) {
            if (match.index > lastIndex) {
              boldTextResult.push(paragraphText.substring(lastIndex, match.index));
            }
            
            boldTextResult.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
            lastIndex = match.index + match[0].length;
          }
          
          if (lastIndex < paragraphText.length) {
            boldTextResult.push(paragraphText.substring(lastIndex));
          }
          
          // If there were no bold matches, just use the paragraph text
          if (boldTextResult.length === 0) {
            boldTextResult.push(paragraphText);
          }
          
          return <p key={`p-${currentIndex}-${pIndex}`} className="mb-2">{boldTextResult}</p>;
        });
        
        processedParts.push(...paragraphs);
      } else if (i % 3 === 1) {
        // This is a timestamp marker [MM:SS]
        const timeMatch = timeStampParts[i+1]; // The next part contains the actual time
        if (timeMatch) {
          processedParts.push(
            <button
              key={`ts-${currentIndex}-${i}`}
              onClick={() => onTimestampClick(timeMatch)}
              className="text-blue-600 hover:text-blue-800 underline font-medium mx-0.5 px-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-300"
              title={`Jump to ${timeMatch} in video`}
            >
              {part} 
            </button>
          );
        }
      }
      
      // Skip the 3rd part which is already handled
      if (i % 3 === 0) currentIndex++;
    }
    
    if (processedParts.length === 0) {
      return <span>{text}</span>;
    }
    
    return <div className="space-y-1">{processedParts}</div>;
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

      {/* Messages Area - Fixed height with scrolling */}
      <div 
        ref={chatContainerRef} 
        className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50 to-white scrollbar-thin"
        style={{ 
          height: 'calc(100vh - 14rem)', // For mobile/tablet
          maxHeight: 'calc(100vh - 14rem)',
          minHeight: '300px',
          overflowY: 'auto'
        }}
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
              timestamp={formatTime(message.timestamp)}
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