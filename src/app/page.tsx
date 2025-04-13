// FILE: src/app/page.tsx
'use client'; 

import { useState } from 'react';
import { useRouter } from 'next/navigation'; 
import { motion } from 'motion/react'; 
import { MessageSquare, Search, ArrowRight, LogIn } from 'lucide-react';
import { NavBar } from '@/app/components/NavBar'; 
import { RecentConversationsGrid } from '@/app/components/RecentConversationsGrid';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, isLoading: isAuthLoading, session, signInWithGoogle } = useAuth();
  const isSignedIn = !!user && !!session;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      router.push(`/video/${videoId}`);
    } else {
      setError('Please enter a valid YouTube URL');
    }
  };

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white text-slate-900">
      <NavBar /> 

      <div className="container mx-auto px-4 pt-16 pb-16 max-w-3xl">
        {/* Simple Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center shadow-sm mr-3">
              <MessageSquare size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">
              YouTube AI Chat
            </h1>
          </div>
          <p className="text-lg text-slate-600">
            Chat with AI about any YouTube video content
          </p>
        </div>

        {isAuthLoading ? (
          <div className="mt-12 text-center text-slate-500">Loading...</div>
        ) : isSignedIn ? (
          <div>
            {/* Video URL Input Form for Signed In Users */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm mb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="video-url" className="block text-sm font-medium text-slate-700 mb-2">
                    Enter YouTube Video URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Search className="h-5 w-5" />
                    </div>
                    <input
                      id="video-url"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full rounded-md border border-slate-300 pl-10 py-2.5 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                      aria-label="YouTube Video URL Input"
                    />
                  </div>
                  {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-150"
                  aria-label="Watch and Chat about the video"
                >
                  Watch and Chat
                  <ArrowRight size={16} />
                </motion.button>
              </form>
            </div>
            
            {/* Recent Conversations Grid */}
            <RecentConversationsGrid />
          </div>
        ) : (
          <div className="mt-12 text-center bg-white p-8 rounded-lg shadow-md border border-slate-200 max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">Sign In Required</h2>
            <p className="text-slate-600 mb-6">
              Please sign in with your Google account to view your chat history and start new conversations.
            </p>
            <button 
              onClick={signInWithGoogle}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-6 py-3 rounded-full text-base font-medium transition-colors flex items-center justify-center gap-2 shadow-md w-full sm:w-auto mx-auto"
            >
              <LogIn size={20} />
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}