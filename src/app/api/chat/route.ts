// FILE: src/app/api/chat/route.ts

import { type NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

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
    return NextResponse.json(
      { message: 'AI Service is not configured. Missing API key.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json() as ChatRequestBody;
    const { userMessage, chatHistory = [], videoDetails, timestamp, videoId } = body;

    if (!userMessage || !videoDetails) {
      return NextResponse.json(
        { message: 'Missing required fields: userMessage and videoDetails.' },
        { status: 400 }
      );
    }

    const chat = ai.chats.create({
      model: MODEL_NAME,
      history: chatHistory,
      config: {
        systemInstruction: `You are an AI assistant that helps users understand and discuss the YouTube video titled "${videoDetails.title}".

VIDEO DETAILS:
- Title: ${videoDetails.title}
- Video ID: ${videoId}
- Description: ${videoDetails.description}

INSTRUCTIONS:
1. Focus your answers on the content of this specific video.
2. When the user mentions a timestamp like [MM:SS], relate your answer to that specific part of the video when possible.
3. Acknowledge that you don't have direct access to the video's visual or audio content.
4. Use information from the title, description, and our conversation history to provide helpful answers.
5. Keep responses concise, informative, and conversational.
6. If you don't know something specific about the video content, be honest about your limitations.
7. Format any timestamps in [MM:SS] format to make them clickable in the interface.`,
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      },
    });

    // Include timestamp context directly in the user message if present
    const messageToSend = timestamp !== undefined
      ? `${userMessage} (I'm currently at timestamp [${formatTime(timestamp)}] in the video)`
      : userMessage;

    // Send message to the chat
    const response = await chat.sendMessage({
      message: messageToSend,
    });

    if (!response || !response.text) {
      console.error("Gemini API returned an empty response or no text.", response);
      throw new Error("Received an empty response from the AI.");
    }

    return NextResponse.json({ aiMessage: response.text }, { status: 200 });

  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    let errorMessage = 'Failed to get response from AI assistant.';
    let statusCode = 500;

     if (error.message?.includes('blocked') || error.response?.promptFeedback?.blockReason) {
         errorMessage = "The response was blocked due to safety settings.";
         statusCode = 400; // Or another appropriate code
     } else if (error instanceof SyntaxError) {
        errorMessage = "Invalid request format.";
        statusCode = 400;
     } else if (error.message) {
        errorMessage = error.message;
     }

    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
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