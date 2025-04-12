import { YoutubeTranscript } from 'youtube-transcript';

interface TranscriptEntry {
  text: string;
  offset: number;
  duration: number;
}

interface CachedTranscript {
  entries: TranscriptEntry[];
  timestamp: number;
}

const transcriptCache = new Map<string, CachedTranscript>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Track rate limiting for transcript API
interface RateLimitTracker {
  lastRequestTime: number;
  requestCount: number;
  resetTime: number;
}

const rateLimitTracker: RateLimitTracker = {
  lastRequestTime: 0,
  requestCount: 0,
  resetTime: Date.now() + 60000 // Reset after 1 minute initially
};

// Maximum requests per minute to avoid rate limiting
const MAX_REQUESTS_PER_MINUTE = 10;

/**
 * Fetch transcript for a YouTube video and cache it with rate limiting and retries
 */
export async function getTranscript(videoId: string): Promise<TranscriptEntry[] | null> {
  // Check if we have a valid cached transcript
  const cached = transcriptCache.get(videoId);
  const now = Date.now();
  
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached transcript for video ${videoId}`);
    return cached.entries;
  }
  
  // Check rate limiting
  if (now > rateLimitTracker.resetTime) {
    // Reset counter if we're past the reset time
    rateLimitTracker.requestCount = 0;
    rateLimitTracker.resetTime = now + 60000; // Reset after 1 minute
  }
  
  if (rateLimitTracker.requestCount >= MAX_REQUESTS_PER_MINUTE) {
    // Calculate time to wait before next request
    const timeToWait = rateLimitTracker.resetTime - now;
    if (timeToWait > 0) {
      console.log(`Rate limit reached for transcript API. Waiting ${timeToWait}ms before retrying.`);
      // Wait until reset time
      await new Promise(resolve => setTimeout(resolve, timeToWait + 100)); // Add 100ms buffer
      // Recursively call this function after waiting
      return getTranscript(videoId);
    }
  }
  
  // Implement retry logic
  const MAX_RETRIES = 3;
  let retries = 0;
  let lastError: any = null;
  
  while (retries < MAX_RETRIES) {
    try {
      // Update rate limit tracking
      rateLimitTracker.lastRequestTime = Date.now();
      rateLimitTracker.requestCount++;
      
      console.log(`Fetching transcript for video ${videoId} (attempt ${retries + 1}/${MAX_RETRIES})`);
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcript || transcript.length === 0) {
        console.log(`No transcript available for video ${videoId}`);
        return null;
      }
      
      // Cache the transcript
      transcriptCache.set(videoId, {
        entries: transcript,
        timestamp: now
      });
      
      return transcript;
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a rate limiting or temporary error
      const errorMessage = error?.message || '';
      const isRateLimited = 
        errorMessage.includes('rate') || 
        errorMessage.includes('429') || 
        errorMessage.includes('too many');
        
      const isTemporaryError = 
        errorMessage.includes('timeout') || 
        errorMessage.includes('network') || 
        errorMessage.includes('temporary');
      
      if (isRateLimited || isTemporaryError) {
        retries++;
        if (retries < MAX_RETRIES) {
          // Exponential backoff: wait 2^retries * 500ms before retrying
          const delay = Math.pow(2, retries) * 500;
          console.log(`Retrying transcript fetch in ${delay}ms (attempt ${retries}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } else {
        // Don't retry for other errors
        break;
      }
    }
  }
  
  console.error(`Error fetching transcript for video ${videoId}:`, lastError);
  return null;
}

/**
 * Extract transcript snippet around a specific timestamp
 * @param transcript The full transcript
 * @param timestampMs The timestamp in milliseconds
 * @param windowMs The window size in milliseconds (how much context to include before and after)
 */
export function getTranscriptSnippet(
  transcript: TranscriptEntry[],
  timestampMs: number,
  windowMs: number = 20000 // Default 20 seconds (10s before, 10s after)
): string {
  if (!transcript || transcript.length === 0) return '';
  
  const relevantEntries = transcript.filter(entry => {
    const entryStart = entry.offset;
    const entryEnd = entry.offset + entry.duration;
    
    // Check if this entry is within our window
    return (
      (entryStart >= timestampMs - windowMs && entryStart <= timestampMs + windowMs) ||
      (entryEnd >= timestampMs - windowMs && entryEnd <= timestampMs + windowMs) ||
      (entryStart <= timestampMs - windowMs && entryEnd >= timestampMs + windowMs)
    );
  });
  
  if (relevantEntries.length === 0) return '';
  
  // Format the entries with timestamps
  return relevantEntries.map(entry => {
    const seconds = Math.floor(entry.offset / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timestamp = `[${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}]`;
    
    return `${timestamp} ${entry.text}`;
  }).join('\n');
}

/**
 * Parse a timestamp string in [MM:SS] format to milliseconds
 */
export function parseTimestamp(timestampStr: string): number | null {
  const match = timestampStr.match(/\[(\d{1,2}):(\d{2})\]/);
  if (!match) return null;
  
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  
  return (minutes * 60 + seconds) * 1000; // Convert to milliseconds
}

/**
 * Extract timestamps from a message
 */
export function extractTimestamps(message: string): number[] {
  const timestampRegex = /\[(\d{1,2}):(\d{2})\]/g;
  const timestamps: number[] = [];
  
  let match;
  while ((match = timestampRegex.exec(message)) !== null) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    timestamps.push((minutes * 60 + seconds) * 1000); // Convert to milliseconds
  }
  
  return timestamps;
}
