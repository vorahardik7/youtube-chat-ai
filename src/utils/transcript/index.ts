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

/**
 * Fetch transcript for a YouTube video and cache it
 */
export async function getTranscript(videoId: string): Promise<TranscriptEntry[] | null> {
  // Check if we have a valid cached transcript
  const cached = transcriptCache.get(videoId);
  const now = Date.now();
  
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached transcript for video ${videoId}`);
    return cached.entries;
  }
  
  // Fetch new transcript
  try {
    console.log(`Fetching transcript for video ${videoId}`);
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
  } catch (error) {
    console.error(`Error fetching transcript for video ${videoId}:`, error);
    return null;
  }
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
