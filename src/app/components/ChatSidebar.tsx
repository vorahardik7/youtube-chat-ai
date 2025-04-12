// src/app/components/ChatSidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { getUserConversations, deleteConversation, Conversation } from '@/utils/chatStorage';
import { Clock, MessageSquare, ChevronLeft, X, Trash2, Youtube, Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ChatSidebarProps {
  currentVideoId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({ currentVideoId, isOpen, onClose }: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 z-30 md:hidden" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full bg-white border-r border-slate-200 shadow-xl z-40 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0 w-[320px]' : '-translate-x-full w-0'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Youtube size={18} className="text-teal-600" />
              <span>Your Video Chats</span>
            </h2>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search conversations..." 
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-slate-500 p-8 bg-slate-50 rounded-xl border border-slate-100 my-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={24} className="text-slate-400" />
                </div>
                <h3 className="font-medium text-slate-700 mb-2">No conversations yet</h3>
                <p className="text-sm text-slate-500 mb-4">Your chat history with videos will appear here</p>
                <Link 
                  href="/"
                  className="inline-flex items-center justify-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  Start a new chat
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {conversations.map(conv => (
                  <li key={conv.id}>
                    <div className="relative group">
                      <Link 
                        href={`/video/${conv.videoId}`}
                        className={`block p-4 rounded-xl hover:bg-slate-50 transition-colors ${currentVideoId === conv.videoId ? 'bg-teal-50 border border-teal-100 shadow-sm' : 'bg-white border border-slate-100 shadow-sm'}`}
                      >
                        <h3 className="font-medium text-slate-800 truncate pr-6 line-clamp-2">{conv.videoTitle}</h3>
                        <div className="flex items-center text-xs text-slate-500 mt-2 bg-white/80 w-fit px-2 py-1 rounded-full">
                          <Clock size={12} className="mr-1.5 text-teal-500" />
                          <span>{new Date(conv.lastUpdatedAt).toLocaleString()}</span>
                        </div>
                      </Link>
                      
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        disabled={isDeleting}
                        className="absolute right-3 top-3 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all duration-200"
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
          
          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="text-xs text-center text-slate-500">
              <p>VideoChat AI &copy; {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}