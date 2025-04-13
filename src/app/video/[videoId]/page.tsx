// FILE: src/app/video/[videoId]/page.tsx
'use client'; 

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { ChatWindow } from '@/app/components/ChatWindow';
import { NavBar } from '@/app/components/NavBar';
import YouTube, { YouTubeEvent, YouTubeProps, YouTubePlayer } from 'react-youtube';
import { formatTime } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { saveConversation, saveMessage, getConversationMessages } from '@/utils/chatStorage';
import { Message, VideoDetails } from '@/types';


export default function VideoPage() {
    const params = useParams();
    const videoId = Array.isArray(params.videoId) ? params.videoId[0] : params.videoId;
    const { user, session } = useAuth(); // Use Supabase auth context
    const isSignedIn = !!user && !!session; // Check for both user and session

    const [messages, setMessages] = useState<Message[]>([]);
    const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
    const [player, setPlayer] = useState<YouTubePlayer | null>(null);
    const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

    // Effect to initialize conversation and load existing messages
    useEffect(() => {
        async function initConversation() {
            if (isSignedIn && user && videoDetails) {
                try {
                    setIsLoadingHistory(true);
                    // Create or get existing conversation
                    const convId = await saveConversation(user.id, videoId as string, videoDetails.title);
                    setConversationId(convId);
                    
                    if (convId) {
                        // Load existing messages if any
                        const existingMessages = await getConversationMessages(convId);
                        if (existingMessages.length > 0) {
                            setMessages(existingMessages);
                        }
                    }
                } catch (error) {
                    console.error('Error initializing conversation:', error);
                } finally {
                    setIsLoadingHistory(false);
                }
            }
        }
        
        if (videoDetails) {
            initConversation();
        }
    }, [isSignedIn, user, videoId, videoDetails]);

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
                    } catch {
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
            } catch { /* Ignore */ }
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
            } catch {
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

        // Save user message to Supabase if signed in
        if (isSignedIn && conversationId) {
            saveMessage(conversationId, userMsg).catch(err => {
                console.error('Error saving user message:', err);
            });
        }

        // Create a streaming message placeholder
        const aiMessageId = Date.now() + 1;
        const streamingMessage: Message = {
            id: aiMessageId,
            user: 'AI Assistant',
            text: '',  // Start empty and will be filled as we receive chunks
            timestamp: messageTimestamp,
            isAi: true,
            isStreaming: true, // Mark as streaming for UI indicator
        };
        
        setMessages(prev => [...prev, streamingMessage]);

        try {
            // Prepare chat history in the format expected by the API
            const chatHistory = messages
                .filter(msg => !msg.text.includes('Thinking about your question') && !msg.isStreaming) // Filter out thinking/streaming messages
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

            // Call the chat API with streaming enabled
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

            if (!response.body) {
                throw new Error('Response body is not readable');
            }

            // Process the streaming response
            const reader = response.body.getReader();
            let accumulatedText = '';
            
            // Read the stream chunks
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                // Convert the chunk to text
                const chunkText = new TextDecoder().decode(value);
                
                try {
                    // The response might contain multiple JSON objects, so we need to handle that
                    const jsonChunks = chunkText.split('\n').filter(Boolean);
                    
                    for (const jsonChunk of jsonChunks) {
                        const parsedChunk = JSON.parse(jsonChunk);
                        
                        if (parsedChunk.error) {
                            throw new Error(parsedChunk.error);
                        }
                        
                        if (parsedChunk.chunk) {
                            // Append the new text to our accumulated text
                            accumulatedText += parsedChunk.chunk;
                            
                            // Update the message with the accumulated text so far
                            setMessages(prev => 
                                prev.map(msg => 
                                    msg.id === aiMessageId 
                                        ? {
                                            ...msg,
                                            text: accumulatedText,
                                          }
                                        : msg
                                )
                            );
                        }
                        
                        // If this is the last chunk, finalize the message
                        if (parsedChunk.done) {
                            // Use the full response if provided
                            if (parsedChunk.fullResponse) {
                                accumulatedText = parsedChunk.fullResponse;
                            }
                            
                            // Update the message one last time and remove the streaming flag
                            const finalAiMessage = {
                                id: aiMessageId,
                                user: 'AI Assistant',
                                text: accumulatedText,
                                timestamp: messageTimestamp,
                                isAi: true,
                                isStreaming: false
                            };
                            
                            setMessages(prev => 
                                prev.map(msg => 
                                    msg.id === aiMessageId ? finalAiMessage : msg
                                )
                            );
                            
                            // Save AI message to Supabase if signed in
                            if (isSignedIn && conversationId) {
                                saveMessage(conversationId, finalAiMessage).catch(err => {
                                    console.error('Error saving AI message:', err);
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error parsing stream chunk:', e, chunkText);
                }
            }
            
        } catch (error) {
            console.error('Error calling chat API:', error);
            
            // Replace streaming message with error
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                    ? {
                        ...msg,
                        text: `Sorry, I couldn't process your request. ${error instanceof Error ? error.message : 'An unknown error occurred.'}`,
                        isStreaming: false,
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

        let totalSeconds = 0;
        
        // Check if the timeString is in MM:SS format
        const parts = timeString.match(/(\d{1,2}):(\d{2})/);
        if (parts) {
            const minutes = parseInt(parts[1], 10);
            const seconds = parseInt(parts[2], 10);
            totalSeconds = (minutes * 60) + seconds;
        } 
        // Check if timeString is a numeric value (for TIMESTAMP_X format)
        else if (!isNaN(Number(timeString))) {
            // If it's a numeric string, convert to number
            // The AI might be using seconds or milliseconds, so we need to handle both
            const numericValue = Number(timeString);
            
            // If it's a large number, assume it's milliseconds and convert to seconds
            if (numericValue > 1000) {
                totalSeconds = Math.floor(numericValue / 1000);
            } else {
                totalSeconds = numericValue;
            }
        } else {
            console.warn("Could not parse timestamp:", timeString);
            return;
        }
        
        try {
            player.seekTo(totalSeconds, true); // Seek and allow seek ahead
            console.log(`Seeking to ${totalSeconds} seconds`);
        } catch (e) {
            console.error("Error seeking video:", e)
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
        <div className="flex flex-col h-screen bg-white">
            
            <NavBar />

            {/* Main Content Grid - Using flex for better height distribution */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {/* Video Column */}
                <div className="lg:w-1/2 bg-slate-50 p-4 flex flex-col overflow-y-auto">
                    {/* YouTube Player Container */}
                    <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-lg mb-6 sticky top-4 z-5 border border-slate-800">
                        {!videoId ? (
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-6">
                                <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                                        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                                        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                                    </svg>
                                </div>
                                <p className="text-slate-400 text-center px-4 font-medium">No Video ID provided</p>
                                <Link href="/" className="mt-4 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-full text-sm transition-colors">
                                    Go to Home
                                </Link>
                            </div>
                        ) : error && !player ? ( // Show player error only if player itself failed, not just details loading
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 text-red-700 p-6">
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 shadow-sm">
                                    <AlertTriangle size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-center font-bold text-lg mb-2">Player Error</h3>
                                <p className="text-center text-sm max-w-md">{error}</p>
                                <button 
                                    onClick={() => window.location.reload()} 
                                    className="mt-4 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : ( // Render player if we have an ID and no critical player error
                            <div className="relative w-full h-full">
                                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent z-10 pointer-events-none"></div>
                                <YouTube
                                    videoId={videoId}
                                    opts={playerOpts}
                                    onReady={handlePlayerReady}
                                    onStateChange={handlePlayerStateChange}
                                    onError={handlePlayerError}
                                    className="absolute top-0 left-0 w-full h-full"
                                />
                                {currentTimestamp > 0 && (
                                    <div className="absolute bottom-4 right-4 z-10 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                                        {formatTime(currentTimestamp)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Video Info Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-md mt-8 flex-shrink-0">
                        {isLoading && ( // Show skeleton only during initial load
                            <div className="animate-pulse space-y-4">
                                <div className="h-6 bg-slate-200 rounded-full w-3/4"></div>
                                <div className="h-5 bg-slate-200 rounded-full w-1/2"></div>
                                <div className="flex gap-2 mt-2">
                                    <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
                                    <div className="h-8 bg-slate-200 rounded-full w-1/3"></div>
                                </div>
                                <div className="h-24 bg-slate-100 rounded-lg w-full mt-3"></div>
                            </div>
                        )}
                        {/* Show details error if details failed *and* not loading */}
                        {!isLoading && error && !videoDetails && (
                             <div className="flex items-start gap-3 text-red-600 p-4 bg-red-50 rounded-lg border border-red-100">
                                <div className="p-2 bg-red-100 rounded-full">
                                    <AlertTriangle size={18} className="flex-shrink-0 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-red-700 mb-1">Error Loading Video</h3>
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                             </div>
                        )}
                        {videoDetails && (
                            <>
                                <h2 className="font-bold text-slate-800 text-lg md:text-xl leading-tight">{videoDetails.title}</h2>
                                <div className="flex flex-wrap items-center gap-3 mt-3">
                                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">C</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">{videoDetails.channelTitle}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 px-2 py-1 bg-slate-50 rounded-full border border-slate-200">
                                        {videoDetails.publishedAt ? new Date(videoDetails.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date unavailable'}
                                    </p>
                                </div>
                                {videoDetails.description && (
                                    <details open className="mt-4 text-sm text-slate-600 flex flex-col flex-grow">
                                        <summary className="cursor-pointer text-slate-600 hover:text-teal-600 font-medium mb-3 flex items-center gap-2 w-fit transition-colors">
                                            <span>Video Description</span>
                                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 details-marker">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                </svg>
                                            </div>
                                        </summary>
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex-grow overflow-auto max-h-[250px] shadow-inner">
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
                <div className="lg:w-1/2 flex flex-col overflow-hidden">
                    <ChatWindow 
                        messages={messages}
                        isLoading={isLoading || isLoadingHistory}
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
        </div>
    );
}