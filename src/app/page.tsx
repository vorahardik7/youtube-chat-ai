// FILE: src/app/page.tsx
'use client'; 

import { useState } from 'react';
import { useRouter } from 'next/navigation'; 
import { motion } from 'motion/react'; 
import { MessageSquare, Search, ArrowRight } from 'lucide-react';
import { NavBar } from '@/app/components/NavBar'; 

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const router = useRouter(); 

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
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <NavBar /> 

      <div className="container mx-auto px-4 pt-20 md:pt-28 pb-16 max-w-screen-md">

        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center shadow-sm mr-3">
              <MessageSquare size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">
              Youtube AI
            </h1>
          </div>
          <p className="text-lg text-slate-600">
            Watch YouTube videos and chat with an AI about the content
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm"
        >
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
                  required // HTML5 required validation
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

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              How it works:
            </h3>
            <ol className="list-decimal pl-5 text-sm text-slate-600 space-y-2">
              <li>Paste any YouTube video URL in the field above.</li>
              <li>Click "Watch and Chat" to load the video and chat interface.</li>
              <li>Our AI analyzes the video content and captions.</li>
              <li>Ask questions and get contextual answers about the video.</li>
              <li>Reference specific times using [MM:SS] format.</li>
            </ol>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-center text-slate-500 mt-8"
        >
          © 2024 VideoChat AI. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
}