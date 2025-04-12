// FILE: src/app/api/chat/route.ts

import { type NextRequest } from 'next/server';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { formatTime } from '@/utils/formatters';
import { getTranscript, getTranscriptSnippet, extractTimestamps } from '@/utils/transcript';

interface ChatRequestBody {
  userMessage: string;
  chatHistory: Array<{
    role: string;
    parts: Array<{text: string}>;
  }>;
  videoDetails: {
    title: string;
    description: string;
  };
  videoId: string;
  timestamp?: number; 
}

const MODEL_NAME = "gemini-2.0-flash";
const API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY as string });

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return new Response(
      JSON.stringify({ message: 'AI Service is not configured. Missing API key.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json() as ChatRequestBody;
    const { userMessage, chatHistory = [], videoDetails, timestamp, videoId } = body;

    if (!userMessage || !videoDetails) {
      return new Response(
        JSON.stringify({ message: 'Missing required fields: userMessage and videoDetails.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const chat = ai.chats.create({
      model: MODEL_NAME,
      history: chatHistory,
      config: {
        systemInstruction: `You are an AI assistant helping a user understand the YouTube video titled "${videoDetails.title}".

VIDEO DETAILS:
- Title: ${videoDetails.title}
- Video ID: ${videoId}
- Description: ${videoDetails.description} (May contain timestamps like [MM:SS] Topic)

YOUR TASK:
- Answer the user's questions about the video concisely and naturally.
- Use information from the video description and any provided transcript snippets.
- Refer to timestamps ([MM:SS]) when relevant to the user's query.
- Use bullet points only if needed for lists or clarity. Avoid overly complex formatting.
- If asked about a specific time, focus on what's likely happening then, using context.
- If unsure, state that clearly.`,
        maxOutputTokens: 1500,
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      },
    });

    // Fetch transcript if available
    const transcript = await getTranscript(videoId);
    
    // Prepare transcript context
    let transcriptContext = '';
    let timestampsToCheck: number[] = [];
    
    // Check for explicit timestamp in the request
    if (timestamp !== undefined) {
      timestampsToCheck.push(timestamp);
    }
    
    // Also check for timestamps mentioned in the message
    const mentionedTimestamps = extractTimestamps(userMessage);
    if (mentionedTimestamps.length > 0) {
      timestampsToCheck = [...timestampsToCheck, ...mentionedTimestamps];
    }
    
    // Get transcript snippets for all relevant timestamps
    if (transcript && timestampsToCheck.length > 0) {
      // Deduplicate timestamps
      const uniqueTimestamps = [...new Set(timestampsToCheck)];
      
      // Get snippets for each timestamp and combine them
      const snippets = uniqueTimestamps.map(ts => {
        const formattedTime = formatTime(ts);
        const snippet = getTranscriptSnippet(transcript, ts);
        // Add a marker for the specific timestamp within the snippet context
        return snippet ? `TRANSCRIPT AROUND [${formattedTime}]:\n${snippet}\n(User is asking about [${formattedTime}])` : '';
      }).filter(Boolean);
      
      if (snippets.length > 0) {
        transcriptContext = `\n\nRELEVANT TRANSCRIPT SECTIONS:\n${snippets.join('\n')}\n`;
      }
    }
    
    // Keep the user message simple
    let messageToSend = userMessage;
    
    // Construct the context to send to the AI
    let fullContext = messageToSend;
    if (timestamp !== undefined) {
        fullContext += `\n(The user is specifically asking about the moment around [${formatTime(timestamp)}])`;
    }
    if (transcriptContext) {
        fullContext += transcriptContext;
    }
    
    // Create a new ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use streaming API
          const streamingResponse = await chat.sendMessageStream({
            message: fullContext, // Send the combined context
          });

          // Initialize a variable to accumulate the response text
          let responseText = '';

          // Process each chunk as it arrives
          for await (const chunk of streamingResponse) {
            if (chunk.text) {
              // Append the new chunk to our accumulated text
              responseText += chunk.text;
              
              // Send the chunk to the client
              controller.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({ chunk: chunk.text, done: false })
                )
              );
            }
          }

          // Send a final message indicating the stream is complete
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({ chunk: '', done: true, fullResponse: responseText })
            )
          );

          // Close the stream
          controller.close();
        } catch (error) {
          console.error('Error in streaming response:', error);
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({ 
                error: error instanceof Error ? error.message : 'Unknown error during streaming', 
                done: true 
              })
            )
          );
          controller.close();
        }
      }
    });

    // Return the stream as the response
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    let errorMessage = 'Failed to get response from AI assistant.';
    let statusCode = 500;
    let errorCode = 'UNKNOWN_ERROR';

    // Handle different types of errors
    if (error.message?.includes('blocked') || error.response?.promptFeedback?.blockReason) {
      errorMessage = "The response was blocked due to safety settings.";
      statusCode = 400;
      errorCode = 'CONTENT_BLOCKED';
    } else if (error instanceof SyntaxError) {
      errorMessage = "Invalid request format.";
      statusCode = 400;
      errorCode = 'INVALID_FORMAT';
    } else if (error.message?.includes('rate') || error.message?.includes('quota') || error.message?.includes('limit')) {
      // Rate limit or quota exceeded
      errorMessage = "AI service rate limit reached. Please try again in a moment.";
      statusCode = 429;
      errorCode = 'RATE_LIMITED';
    } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
      // Request timeout
      errorMessage = "The AI service took too long to respond. Please try again.";
      statusCode = 408;
      errorCode = 'TIMEOUT';
    } else if (error.message?.includes('token') || error.message?.includes('credential') || error.message?.includes('auth')) {
      // Authentication issues
      errorMessage = "There was an authentication issue with the AI service.";
      statusCode = 401;
      errorCode = 'AUTH_ERROR';
      console.error('Authentication error with Gemini API - check your API key configuration');
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Add retry-after header for rate limits
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (statusCode === 429) {
      // Suggest client retry after 10 seconds
      headers['Retry-After'] = '10';
    }

    return new Response(
      JSON.stringify({ 
        message: errorMessage,
        error: errorCode,
        retryable: statusCode === 429 || statusCode === 408 || statusCode === 500
      }),
      { status: statusCode, headers }
    );
  }
}
