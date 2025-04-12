'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { getUserConversations, deleteConversation, Conversation } from '@/utils/chatStorage';
import { NavBar } from '@/app/components/NavBar';
import Link from 'next/link';
import { MessageSquare, Clock, Youtube, Trash2 } from 'lucide-react';
// Navigation will be handled with Link components

export default function HistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, isSignedIn } = useUser();
  // We'll use Link components for navigation instead of router

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

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Your Conversation History</h1>
        
        {!isSignedIn ? (
          <div className="text-center p-12 bg-slate-50 rounded-lg">
            <p className="text-slate-600 mb-4">Please sign in to view your conversation history.</p>
            <Link href="/" className="inline-block bg-teal-600 text-white px-4 py-2 rounded-md">
              Go to Home
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center p-12 bg-slate-50 rounded-lg">
            <MessageSquare size={48} className="mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-medium text-slate-700 mb-2">No conversations yet</h2>
            <p className="text-slate-600 mb-4">Start chatting with AI about YouTube videos to see your history here.</p>
            <Link href="/" className="inline-block bg-teal-600 text-white px-4 py-2 rounded-md">
              Start a Conversation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversations.map(conv => (
              <div key={conv.id} className="relative group">
                <Link 
                  href={`/video/${conv.videoId}`}
                  className="block p-4 rounded-lg border border-slate-200 hover:border-teal-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
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
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
