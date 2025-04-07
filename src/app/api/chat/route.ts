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
        systemInstruction: `You are an AI assistant specialized in analyzing and discussing YouTube video content. You're helping a user understand the YouTube video titled "${videoDetails.title}".

VIDEO DETAILS:
- Title: ${videoDetails.title}
- Video ID: ${videoId}
- Description: ${videoDetails.description}

INFORMATION EXTRACTION:
- The video description may contain timestamps with topics ([MM:SS] Topic). Use these to understand the video structure.
- Look for patterns like "[04:18] Tariff Day's Price Tag" which indicate the beginning of a segment.
- Use these timestamps to infer what content is being discussed at any point in the video.
- When answering questions about a specific timestamp, check if it falls within a known segment based on the description.
- Extract key numbers, names, and facts from the description to include in your answers.

RESPONSE GUIDELINES:
1. PROVIDE DETAILED ANSWERS: Give comprehensive explanations about the video content when asked about specific parts or topics.
2. ORGANIZE YOUR RESPONSES: Use markdown formatting with headings (##), bullet points, and paragraphs to make your responses easy to read.
3. HIGHLIGHT KEY INFORMATION: Bold (*text*) important points, numbers, and facts discussed in the video.
4. TIMESTAMP PRECISION: When referring to timestamps, use the [MM:SS] format and be specific about what happens at that moment in the video.
5. QUOTE THE VIDEO: When possible, include what was actually said at specific timestamps.
6. INTELLIGENT INFERENCE: If asked about a timestamp, use the context of the entire video to provide meaningful insights.
7. BE CONVERSATIONAL: Maintain a helpful, engaging tone while providing authoritative information.

TIMESTAMP QUESTIONS:
- When asked about a specific timestamp, assume it's a key moment in the video.
- Infer the likely topic being discussed based on the overall context and structure of the video.
- Use format: "## At [MM:SS]" as a heading when answering timestamp questions.
- Include a brief analysis of what might have been said immediately before and after the timestamp.
- If you identify that the timestamp is part of a larger segment (like "Tariff Day's Price Tag"), mention the segment context.
- For financial or numerical discussions, highlight the specific numbers being mentioned.

FORMATTING EXAMPLES:
For timestamp questions:
\`\`\`
## At [04:32] - Tariff Impact Analysis

At this point in the video, they're discussing the *economic impact of tariffs* introduced by the Trump administration. The speaker is likely explaining:

* The *$3,600 cost* per household that economists have calculated
* How the tariffs specifically affect certain industries
* The potential impact on Tesla and other companies

This is part of the larger "Tariff Day's Price Tag" segment mentioned at [04:18].
\`\`\`

TECHNICAL NOTES:
- You don't have direct access to the video's visual or audio content beyond what's in the description and conversation history.
- Format any timestamps as [MM:SS] to make them clickable for the user.
- When the user asks about specific sections or timestamps, focus your answer on that particular moment while providing context.

If you're uncertain about specific details, acknowledge your limitations but provide your best analysis based on available information.`,
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

    let messageToSend = userMessage;
    if (timestamp !== undefined) {
      messageToSend = `${userMessage}

I'm at timestamp [${formatTime(timestamp)}] in the video. Please provide a detailed analysis of what's being discussed at this exact moment. 

Remember to:
1. Use the heading format "## At [${formatTime(timestamp)}] - Topic"
2. Explain the specific topic being covered at this timestamp
3. Include any numbers, statistics, or key facts mentioned
4. Highlight the most important points with bold formatting
5. Place this moment in the context of the broader video segment`;
    }

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