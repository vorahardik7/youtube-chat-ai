// src/app/components/RecentConversationsGrid.tsx
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { getUserConversations, deleteConversation, Conversation } from '@/utils/chatStorage';
import Link from 'next/link';
import { Clock, MessageSquare, Youtube, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export function RecentConversationsGrid() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, isSignedIn } = useUser();

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
      }
      setIsDeleting(false);
    }
  };

  if (!isSignedIn) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800">Recent Conversations</h2>
        <Link 
          href="/history"
          className="text-sm text-teal-600 hover:text-teal-700 hover:underline transition-colors"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 bg-white rounded-lg border border-slate-200">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg border border-slate-200">
          <MessageSquare size={32} className="mx-auto mb-3 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No conversations yet</h3>
          <p className="text-slate-600">Start chatting with AI about YouTube videos to see your history here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {conversations.slice(0, 6).map(conv => (
            <motion.div 
              key={conv.id} 
              className="relative group bg-white rounded-lg border border-slate-200 hover:border-teal-200 hover:shadow-md transition-all overflow-hidden"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Link 
                href={`/video/${conv.videoId}`}
                className="block p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Youtube size={20} className="text-red-600" />
                  </div>
                  <h3 className="font-medium text-slate-800 line-clamp-2 pr-6">{conv.videoTitle}</h3>
                </div>
                <div className="flex items-center text-xs text-slate-500 mt-2">
                  <Clock size={12} className="mr-1" />
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
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
