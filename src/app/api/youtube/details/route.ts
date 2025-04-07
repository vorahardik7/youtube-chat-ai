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
      return NextResponse.json(videoSnippet, { status: 200 });
    } else {
      return NextResponse.json(
        { message: 'Video not found on YouTube.' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching from YouTube API:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.errors?.[0]?.message ||
                    error.response?.data?.error?.message ||
                    'Failed to fetch video details from YouTube.';
    return NextResponse.json({ message: message }, { status: status });
  }
}