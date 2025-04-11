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
        return snippet ? `TRANSCRIPT AROUND [${formattedTime}]:\n${snippet}\n` : '';
      }).filter(Boolean);
      
      if (snippets.length > 0) {
        transcriptContext = `\n\nRELEVANT TRANSCRIPT SECTIONS:\n${snippets.join('\n')}\n`;
      }
    }
    
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

    // Add transcript context to the system instruction if available
    if (transcriptContext) {
      // Update the system instruction with transcript context
      await chat.sendMessage({
        message: `ADDITIONAL CONTEXT: ${transcriptContext}

Please use this transcript information to enhance your responses. When answering questions about specific timestamps, refer to what was actually said in the transcript.`
      });
    }
    
    // Create a new ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use streaming API
          const streamingResponse = await chat.sendMessageStream({
            message: messageToSend,
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

     if (error.message?.includes('blocked') || error.response?.promptFeedback?.blockReason) {
         errorMessage = "The response was blocked due to safety settings.";
         statusCode = 400; // Or another appropriate code
     } else if (error instanceof SyntaxError) {
        errorMessage = "Invalid request format.";
        statusCode = 400;
     } else if (error.message) {
        errorMessage = error.message;
     }

    return new Response(
      JSON.stringify({ message: errorMessage }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
