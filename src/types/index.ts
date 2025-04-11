// src/types/index.ts

export interface Message {
  id: number;
  user: string;
  text: string;
  timestamp: number;
  isAi: boolean;
  isStreaming?: boolean;
}

export interface VideoDetails {
  title: string;
  channelTitle?: string;
  description?: string;
  publishedAt?: string;
}
