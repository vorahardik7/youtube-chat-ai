'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Search, ArrowRight, LogIn, Youtube } from 'lucide-react';
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
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-center">
      <div className="max-w-4xl mx-auto px-4 py-12 w-full">
        {/* Header with Logo and App Name */}

        <main className="flex flex-col items-center justify-center">
          {isAuthLoading ? (
            <div className="w-full max-w-md p-8 bg-slate-50 rounded-lg shadow-sm text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-8 bg-slate-200 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-slate-200 rounded mb-3"></div>
                <div className="h-3 w-48 bg-slate-200 rounded"></div>
              </div>
            </div>
          ) : isSignedIn ? (
            <div className="w-full max-w-2xl mx-auto">
              {/* Hero Section */}
              <div className="text-center mb-12">
                <h2 className="text-2xl font-semibold mb-4">Discover deeper insights from videos</h2>
                <p className="text-slate-600 max-w-lg mx-auto">
                  Enter any YouTube URL below to start an AI-powered conversation about the content.
                </p>
              </div>

              {/* Video URL Input Form */}
              <div className="w-full mb-12">
                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-md">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="video-url" className="block text-sm font-medium text-slate-700 mb-2">
                        YouTube Video URL
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-red-500">
                          <Youtube className="h-5 w-5" />
                        </div>
                        <input
                          id="video-url"
                          type="url"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 pl-12 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          aria-label="YouTube Video URL Input"
                        />
                      </div>
                      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 hover:cursor-pointer text-white py-3 px-6 rounded-lg font-medium transition-colors duration-150"
                      aria-label="Watch and Chat about the video"
                    >
                      Start Analyzing Video
                      <ArrowRight size={18} />
                    </button>
                  </form>
                </div>
              </div>
              
              {/* Recent Conversations Section */}
              <div className="w-full">
                <RecentConversationsGrid />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md">
              <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
                <div className="flex justify-center mb-6">
                  <div className="h-16 w-16 bg-red-600 rounded-xl flex items-center justify-center shadow-sm">
                    <MessageSquare size={32} className="text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-900 mb-3">Welcome to YouTubeChat AI</h2>
                <p className="text-slate-600 text-center mb-8">
                  Sign in with your Google account to analyze videos and have intelligent conversations about the content.
                </p>
                <button 
                  onClick={signInWithGoogle}
                  className="w-full bg-blue-600 hover:bg-blue-700 hover:cursor-pointer text-white px-6 py-3 rounded-lg text-base font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <LogIn size={20} />
                  Sign in with Google
                </button>
                
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-medium text-slate-700 mb-4 text-center">What you can do with VideoChat AI</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <Search size={16} />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-slate-600">
                          Analyze any YouTube video with AI
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <MessageSquare size={16} />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-slate-600">
                          Ask questions and get insights about the content
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}