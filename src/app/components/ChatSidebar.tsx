// src/app/components/ChatSidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { getUserConversations, deleteConversation, Conversation } from '@/utils/chatStorage';
import { Clock, MessageSquare, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';

interface ChatSidebarProps {
  currentVideoId?: string;
}

export function ChatSidebar({ currentVideoId }: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    async function loadConversations() {
      if (!isSignedIn || !user) return;
      
      setIsLoading(true);
      const userConversations = await getUserConversations(user.id);
      setConversations(userConversations);
      setIsLoading(false);
    }
    
    loadConversations();
  }, [user, isSignedIn]);
  
  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this conversation?')) {
      setIsDeleting(true);
      const success = await deleteConversation(conversationId);
      if (success) {
        // Remove from local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        // If we're on the page of the deleted conversation, redirect to home
        if (currentVideoId && conversations.find(c => c.id === conversationId && c.videoId === currentVideoId)) {
          router.push('/');
        }
      }
      setIsDeleting(false);
    }
  };

  if (!isSignedIn) return null;

  return (
    <>
      {/* Sidebar Toggle Button */}
      <div 
        className="fixed top-1/2 left-0 transform -translate-y-1/2 z-50"
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-teal-600 text-white p-2 rounded-r-md shadow-lg flex items-center justify-center h-24 ${isOpen ? 'w-6' : 'w-10'} transition-all duration-300`}
          aria-label={isOpen ? "Close chat history" : "Open chat history"}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            {isOpen ? (
              <ChevronLeft size={18} />
            ) : (
              <>
                <ChevronRight size={18} className={`${!isOpen ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-medium whitespace-nowrap rotate-90 tracking-wider">HISTORY</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Sidebar */}
      <motion.div 
        className="fixed top-0 left-0 h-full bg-white border-r border-slate-200 shadow-lg z-40 overflow-hidden"
        initial={{ width: 0, opacity: 0, x: -300 }}
        animate={{ 
          width: isOpen ? 300 : 0,
          opacity: isOpen ? 1 : 0,
          x: isOpen ? 0 : -300
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Your Conversations</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1 rounded-full hover:bg-slate-100"
              aria-label="Close sidebar"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-slate-500 p-8">
                <MessageSquare size={24} className="mx-auto mb-2 text-slate-400" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {conversations.map(conv => (
                  <li key={conv.id}>
                    <div className="relative group">
                      <Link 
                        href={`/video/${conv.videoId}`}
                        className={`block p-3 rounded-lg hover:bg-slate-50 transition-colors ${currentVideoId === conv.videoId ? 'bg-teal-50 border border-teal-100' : 'border border-slate-100'}`}
                      >
                        <h3 className="font-medium text-slate-800 truncate pr-6">{conv.videoTitle}</h3>
                        <div className="flex items-center text-xs text-slate-500 mt-1">
                          <Clock size={12} className="mr-1" />
                          <span>{new Date(conv.lastUpdatedAt).toLocaleString()}</span>
                        </div>
                      </Link>
                      
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        disabled={isDeleting}
                        className="absolute right-2 top-3 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all duration-200"
                        aria-label="Delete conversation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}