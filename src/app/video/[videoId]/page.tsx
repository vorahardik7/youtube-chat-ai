// FILE: src/app/video/[videoId]/page.tsx
'use client'; 

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { ChatWindow } from '@/app/components/ChatWindow';
import YouTube, { YouTubeEvent, YouTubeProps, YouTubePlayer } from 'react-youtube';
import { formatTime } from '@/utils/formatters';

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



export default function VideoPage() {
    const params = useParams();
    const videoId = Array.isArray(params.videoId) ? params.videoId[0] : params.videoId;

    const [messages, setMessages] = useState<Message[]>([]);
    const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
    const [player, setPlayer] = useState<YouTubePlayer | null>(null);
    const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

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
                        id: Date.now() - 1, // Initial user message
                        user: 'You',
                        text: `Tell me about "${details.title}"`,
                        timestamp: 0,
                        isAi: false,
                    },
                    {
                        id: Date.now(),
                        user: 'AI Assistant',
                        text: `Hello! I've analyzed the video "${details.title}" by ${details.channelTitle}. Feel free to ask me any questions about the content. You can mention timestamps like [MM:SS] to reference specific parts.`,
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

    const handleSendMessage = async (message: string) => {
        if (!message || !videoDetails) return; 

        const messageTimestamp = currentTimestamp;

        const userMsg: Message = {
            id: Date.now(),
            user: 'You',
            text: message,
            timestamp: messageTimestamp,
            isAi: false,
        };

        // Update UI with user message
        setMessages(prev => [...prev, userMsg]);
        setIsAiThinking(true);

        // Create a thinking message placeholder
        const thinkingId = Date.now() + 1;
        const thinkingMessage: Message = {
            id: thinkingId,
            user: 'AI Assistant',
            text: `Thinking about your question at [${formatTime(messageTimestamp)}]...`,
            timestamp: messageTimestamp,
            isAi: true,
        };
        
        setMessages(prev => [...prev, thinkingMessage]);

        try {
            // Prepare chat history in the format expected by the API
            const chatHistory = messages
                .filter(msg => !msg.text.includes('Thinking about your question')) // Filter out thinking messages
                .map(msg => ({
                    role: msg.isAi ? 'model' : 'user',
                    parts: [{ text: msg.text }]
                }));
            
            // Ensure history starts with a user turn if it starts with a model message
            if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
                // Add a dummy user message before the first model message
                chatHistory.unshift({
                    role: 'user',
                    parts: [{ text: 'Tell me about this video.' }]
                });
            }

            // Call the chat API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userMessage: message,
                    chatHistory,
                    videoDetails: {
                        title: videoDetails.title,
                        description: videoDetails.description,
                    },
                    videoId,
                    timestamp: messageTimestamp,
                }),
            });

            if (!response.ok) {
                let errorText = `Error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorText = errorData.message || errorText;
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                throw new Error(errorText);
            }

            const data = await response.json();
            
            // Replace thinking message with actual response
            setMessages(prev => prev.map(msg => 
                msg.id === thinkingId 
                    ? {
                        ...msg,
                        text: data.aiMessage,
                      }
                    : msg
            ));
            
        } catch (error) {
            console.error('Error calling chat API:', error);
            
            // Replace thinking message with error
            setMessages(prev => prev.map(msg => 
                msg.id === thinkingId 
                    ? {
                        ...msg,
                        text: `Sorry, I couldn't process your request. ${error instanceof Error ? error.message : 'An unknown error occurred.'}`,
                      }
                    : msg
            ));
        } finally {
            setIsAiThinking(false);
        }
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
            <div className="grid grid-cols-1 lg:grid-cols-2 h-[calc(100vh-3.5rem)] overflow-hidden">
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

                {/* Chat Column - Now using the ChatWindow component */}
                <ChatWindow 
                    messages={messages}
                    isLoading={isLoading}
                    error={error}
                    videoDetails={videoDetails}
                    playerReady={!!player}
                    currentTimestamp={currentTimestamp}
                    isAiThinking={isAiThinking}
                    onSendMessage={handleSendMessage}
                    onTimestampClick={handleTimestampClick}
                    formatTime={formatTime}
                />
            </div>
        </div>
    );
}