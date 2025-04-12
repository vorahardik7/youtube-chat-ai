// FILE: src/app/api/youtube/details/route.ts

import { type NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json(
      { message: 'Missing videoId query parameter.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('YouTube API Key not found in environment variables.');
    return NextResponse.json(
      { message: 'Server configuration error.' },
      { status: 500 }
    );
  }

  const YOUTUBE_API_URL = `https://www.googleapis.com/youtube/v3/videos`;

  // Implement retry logic with exponential backoff
  const MAX_RETRIES = 3;
  let retries = 0;
  let lastError: any = null;

  while (retries < MAX_RETRIES) {
    try {
      const response = await axios.get(YOUTUBE_API_URL, {
        params: {
          part: 'snippet',
          id: videoId,
          key: apiKey,
        },
        timeout: 7000,
      });

      if (response.data.items && response.data.items.length > 0) {
        const videoSnippet = response.data.items[0].snippet;
        // Cache the result for 1 hour to reduce API usage
        return NextResponse.json(videoSnippet, { 
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=3600, s-maxage=3600'
          }
        });
      } else {
        return NextResponse.json(
          { message: 'Video not found on YouTube.' },
          { status: 404 }
        );
      }
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status || 500;
      const errorMessage = error.response?.data?.error?.errors?.[0]?.message ||
                      error.response?.data?.error?.message ||
                      error.message ||
                      'Failed to fetch video details from YouTube.';

      // Check if it's a quota exceeded error
      const isQuotaExceeded = 
        status === 403 && 
        (errorMessage.includes('quota') || errorMessage.includes('Quota'));

      // Check if it's a rate limit error
      const isRateLimited = 
        status === 429 || 
        (status === 403 && errorMessage.includes('rate'));
      
      if (isQuotaExceeded) {
        console.error('YouTube API quota exceeded:', errorMessage);
        return NextResponse.json(
          { 
            message: 'YouTube API quota exceeded. Please try again tomorrow.',
            error: 'QUOTA_EXCEEDED'
          },
          { status: 429 }
        );
      }

      // Only retry on rate limits or server errors
      if (isRateLimited || status >= 500) {
        retries++;
        if (retries < MAX_RETRIES) {
          // Exponential backoff: wait 2^retries * 100ms before retrying
          const delay = Math.pow(2, retries) * 100;
          console.log(`Retrying YouTube API request in ${delay}ms (attempt ${retries}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } else {
        // Don't retry for other errors
        break;
      }
    }
  }

  // If we've exhausted retries or encountered a non-retryable error
  console.error('Error fetching from YouTube API:', lastError?.response?.data || lastError?.message);
  const status = lastError?.response?.status || 500;
  const message = lastError?.response?.data?.error?.errors?.[0]?.message ||
                  lastError?.response?.data?.error?.message ||
                  lastError?.message ||
                  'Failed to fetch video details from YouTube.';
  
  return NextResponse.json({ message: message }, { status: status });
}