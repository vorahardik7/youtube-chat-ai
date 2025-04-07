// FILE: src/app/video/[videoId]/page.tsx
'use client'; 

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowLeft, Send, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { ChatMessage, ChatMessageSkeleton } from '@/app/components/ChatMessage'; 
import YouTube, { YouTubeEvent, YouTubeProps, YouTubePlayer } from 'react-youtube';

interface Message {
    id: number;
    user: string;
    text: string; 
    timestamp: number; 
    isAi: boolean;
}

interface VideoDetails {
    title: string;
    channelTitle: string;
    description: string;
    publishedAt: string;
}

const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) {
        return '00:00';
    }
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoPage() {
    const params = useParams();
    const videoId = Array.isArray(params.videoId) ? params.videoId[0] : params.videoId;

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
    const [player, setPlayer] = useState<YouTubePlayer | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }, [messages]);

    useEffect(() => {
        if (!videoId) {
            setIsLoading(false);
            setError("No video ID found in URL.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setVideoDetails(null);
        setMessages([]);

        const fetchVideoDetails = async () => {
            try {
                const response = await fetch(`/api/youtube/details?videoId=${videoId}`);

                if (!response.ok) {
                    let errorMessage = `HTTP error! status: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (e) {
                        errorMessage = response.statusText || errorMessage;
                    }
                    throw new Error(errorMessage);
                }

                const videoSnippet = await response.json();

                if (!videoSnippet || typeof videoSnippet.title === 'undefined') {
                    console.error("Invalid API response format:", videoSnippet);
                    throw new Error(`Received invalid video details format from API.`);
                }

                const details: VideoDetails = {
                    title: videoSnippet.title || 'Untitled Video',
                    channelTitle: videoSnippet.channelTitle || 'Unknown Channel',
                    description: videoSnippet.description || 'No description available.',
                    publishedAt: videoSnippet.publishedAt || new Date().toISOString(),
                };

                setVideoDetails(details);
                setMessages([
                    {
                        id: Date.now(),
                        user: 'AI Assistant',
                        text: `Hello! I've analyzed the video "${details.title}" by ${details.channelTitle}. Feel free to ask me any questions about the content. You can mention timestamps like [MM:SS] to reference specific parts.`, // Updated initial message
                        timestamp: 0,
                        isAi: true,
                    },
                ]);

            } catch (err) {
                console.error("Error fetching video details:", err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred while loading video details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchVideoDetails();
    }, [videoId]);

    useEffect(() => {
        if (!player || typeof player.getCurrentTime !== 'function') {
            return;
        }
        let intervalId: NodeJS.Timeout | null = null;

        const updateTime = () => {
            try {
                const time = player.getCurrentTime();
                if (typeof time === 'number') {
                    setCurrentTimestamp(Math.floor(time));
                }
            } catch (e) { /* Ignore */ }
        };

        updateTime();
        intervalId = setInterval(updateTime, 1000);

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [player]);

    // --- Event Handlers ---

    const handlePlayerReady = useCallback((event: YouTubeEvent<YouTubePlayer>) => {
        // The event target IS the player instance
        setPlayer(event.target);
        console.log('YouTube player ready.');
    }, []);

    const handlePlayerStateChange = useCallback((event: YouTubeEvent<number>) => {
        if (event.data === 1 && player && typeof player.getCurrentTime === 'function') {
            try {
                const time = player.getCurrentTime();
                if (typeof time === 'number') {
                    setCurrentTimestamp(Math.floor(time));
                }
            } catch (e) {
                /* ignore errors */
            }
        }
    }, [player]);

    const handlePlayerError = useCallback((event: YouTubeEvent<number>) => {
        console.error('YouTube Player Error Code:', event.data);
        let message = 'An error occurred with the YouTube player.';
        switch (event.data) {
            case 2: message = "Invalid video ID or player parameter."; break;
            case 5: message = "HTML5 Player Error."; break;
            case 100: message = "Video not found or removed."; break;
            case 101:
            case 150: message = "Playback in embedded players has been disabled for this video."; break;
        }
        setError(message);
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = newMessage.trim();
        if (!trimmedMessage) return; 

        const messageTimestamp = currentTimestamp;

        const userMsg: Message = {
            id: Date.now(),
            user: 'You',
            text: trimmedMessage,
            timestamp: messageTimestamp,
            isAi: false,
        };

        setMessages(prev => [...prev, userMsg]);
        setNewMessage(''); 

        setTimeout(() => {
            const aiResponse: Message = {
                id: Date.now() + 1, 
                user: 'AI Assistant',
                text: `Thinking about "[${formatTime(messageTimestamp)}]"... Regarding your question "${trimmedMessage}", the main point seems to be... (AI response goes here)`,
                timestamp: messageTimestamp,
                isAi: true,
            };
            setMessages(prev => [...prev, aiResponse]);
        }, 1500);
    };

     const handleTimestampClick = (timeString: string) => {
        if (!player || typeof player.seekTo !== 'function') {
            console.warn("Player not available to seek.");
            return;
        }

        const parts = timeString.match(/(\d{1,2}):(\d{2})/);
        if (parts) {
            const minutes = parseInt(parts[1], 10);
            const seconds = parseInt(parts[2], 10);
            const totalSeconds = (minutes * 60) + seconds;
            try {
                player.seekTo(totalSeconds, true); // Seek and allow seek ahead
                console.log(`Seeking to ${totalSeconds} seconds`);
            } catch (e) {
                console.error("Error seeking video:", e)
            }
        } else {
            console.warn("Could not parse timestamp:", timeString);
        }
     };

    const renderMessageText = (text: string) => {
        const timestampRegex = /(\[(\d{1,2}:\d{2})\])/g;
        const parts = text.split(timestampRegex);

        const elements: React.ReactNode[] = [];
        let lastIndex = 0;
        text.replace(timestampRegex, (match, fullMatch, time, offset) => {
            if (offset > lastIndex) {
                elements.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, offset)}</span>);
            }
            elements.push(
                <button
                    key={`ts-${offset}`}
                    onClick={() => handleTimestampClick(time)}
                    className="text-blue-600 hover:text-blue-800 underline font-medium mx-0.5 px-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-300"
                    title={`Jump to ${time} in video`}
                >
                    {fullMatch} 
                </button>
            );
            lastIndex = offset + match.length;
            return match; 
        });

        if (lastIndex < text.length) {
            elements.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
        }

        if (elements.length === 0) {
            return <span>{text}</span>;
        }

        return elements; 
    };


    const playerOpts: YouTubeProps['opts'] = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1 
        },
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <div className="h-14 border-b border-slate-200 px-4 flex items-center flex-shrink-0 sticky top-0 bg-white z-10 shadow-sm">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-teal-600 transition-colors">
                        <ArrowLeft size={18} />
                        <span className="font-medium text-sm md:text-base">Back</span>
                    </Link>
                    <h1 className="text-base md:text-lg font-semibold text-slate-800 truncate px-2 text-center flex-1 mx-4" title={videoDetails?.title}>
                        {isLoading && !error ? "Loading Video..." : videoDetails?.title || "Video Chat"}
                    </h1>
                    <div className="w-16 md:w-24 flex-shrink-0"></div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
                {/* Video Column */}
                <div className="bg-slate-50 p-4 flex flex-col overflow-y-auto">
                    {/* YouTube Player Container */}
                    <div className="aspect-video bg-black rounded-lg overflow-hidden relative shadow-md mb-4 sticky top-4 z-5">
                        {!videoId ? (
                             <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                <p className="text-slate-400 text-center px-4">No Video ID provided.</p>
                            </div>
                        ) : error && !player ? ( // Show player error only if player itself failed, not just details loading
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-100 text-red-700 p-4">
                                <AlertTriangle size={32} className="mb-2" />
                                <p className="text-center font-medium">Player Error</p>
                                <p className="text-center text-sm mt-1">{error}</p>
                            </div>
                        ) : ( // Render player if we have an ID and no critical player error
                            <YouTube
                                videoId={videoId}
                                opts={playerOpts}
                                onReady={handlePlayerReady}
                                onStateChange={handlePlayerStateChange}
                                onError={handlePlayerError}
                                className="absolute top-0 left-0 w-full h-full"
                            />
                        )}
                    </div>

                    {/* Video Info Section */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm mt-8 flex-shrink-0">
                        {isLoading && ( // Show skeleton only during initial load
                            <div className="animate-pulse space-y-3">
                                <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                <div className="h-3 bg-slate-200 rounded w-full mt-3"></div>
                                <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                            </div>
                        )}
                        {/* Show details error if details failed *and* not loading */}
                        {!isLoading && error && !videoDetails && (
                             <div className="flex items-start gap-2 text-red-600 p-2 bg-red-50 rounded-lg">
                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                <p className="text-sm">Could not load video information: {error}</p>
                             </div>
                        )}
                        {videoDetails && (
                            <>
                                <h2 className="font-semibold text-slate-800 text-base md:text-lg">{videoDetails.title}</h2>
                                <p className="text-sm text-slate-500 mt-1">{videoDetails.channelTitle}</p>
                                {videoDetails.description && (
                                    <details open className="mt-3 text-sm text-slate-600 flex flex-col flex-grow">
                                        <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium mb-2">
                                            Video Description
                                        </summary>
                                        <div className="bg-slate-50 p-3 rounded-md border border-slate-200 flex-grow overflow-auto h-[250px]">
                                            <p className="whitespace-pre-wrap scrollbar-thin">
                                                {videoDetails.description}
                                            </p>
                                        </div>
                                    </details>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Chat Column */}
                <div className="border-l border-slate-200 flex flex-col h-full max-h-[calc(100vh-3.5rem)] lg:max-h-full overflow-hidden">
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
                            <span>{player ? formatTime(currentTimestamp) : '--:--'}</span>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div 
                        ref={chatContainerRef} 
                        className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50 to-white scrollbar-thin"
                    >
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

                    {/* Message Input Area */}
                    <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
                        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Ask a question about the video..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={isLoading || !player} // Disable if loading or player not ready
                                    className="w-full rounded-md border border-slate-300 px-4 py-2.5 pr-10 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    aria-label="Chat message input"
                                />
                                {/* Insert Timestamp Button */}
                                <button
                                    type="button"
                                    title="Insert Current Timestamp"
                                    onClick={() => setNewMessage(prev => `${prev} [${formatTime(currentTimestamp)}]`)}
                                    disabled={isLoading || !player}
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
                                disabled={!newMessage.trim() || isLoading || !player}
                                className="inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-3 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                aria-label="Send message"
                            >
                                <Send size={16} />
                                <span className="hidden sm:inline">Send</span>
                            </motion.button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}