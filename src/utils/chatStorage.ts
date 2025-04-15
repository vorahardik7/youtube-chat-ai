// src/utils/chatStorage.ts

import { supabase } from './supabase';
import { Message } from '@/types';

export interface Conversation {
  id: string;
  videoId: string;
  videoTitle: string;
  createdAt: string;
  lastUpdatedAt: string;
}

export async function saveConversation(userId: string, videoId: string, videoTitle: string): Promise<string | null> {
  try {
    console.log('Saving conversation for user:', userId, 'video:', videoId);
    
    const { data: existingData, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .maybeSingle();
    
    if (findError) {
      console.error('Error finding existing conversation:', findError); // Log the full error
      throw findError;
    }
    
    if (existingData) {
      console.log('Updating existing conversation:', existingData.id);
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          video_title: videoTitle,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
        .select();
      
      if (updateError) {
        console.error('Error updating conversation:', updateError);
        throw updateError;
      }
      
      return existingData.id;
    } else {
      console.log('Creating new conversation');
      const { data: insertData, error: insertError } = await supabase
        .from('conversations')
        .insert({ 
          user_id: userId, 
          video_id: videoId, 
          video_title: videoTitle
          // timestamps handled by Supabase
        })
        .select();
      
      if (insertError) {
        console.error('Error inserting conversation:', insertError); // Log the full error
        throw insertError;
      }
      
      console.log('Created conversation:', insertData?.[0]?.id);
      return insertData?.[0]?.id || null;
    }
  } catch (error: unknown) { 
    console.error('Error saving conversation:', error); // Log the full error
    return null;
  }
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error); // Log the full error
    return false;
  }
}

const MAX_CONTENT_SIZE = 1024 * 8; 

export async function saveMessage(conversationId: string, message: Message): Promise<boolean> {
  try {
    console.log('Saving message for conversation:', conversationId);
    
    // For debugging, log the message structure
    console.log('Message structure:', {
      id: message.id,
      isAi: message.isAi,
      timestamp: message.timestamp,
      textLength: message.text?.length || 0
    });
    
    // Prepare content, ensuring it doesn't exceed size limits
    let content: string;
    if (typeof message.text === 'string') {
      content = message.text;
    } else {
      content = JSON.stringify(message);
    }
    
    // Truncate content if it exceeds the maximum size
    if (content.length > MAX_CONTENT_SIZE) {
      console.warn(`Message content exceeds ${MAX_CONTENT_SIZE} bytes, truncating...`);
      content = content.substring(0, MAX_CONTENT_SIZE - 3) + '...';
    }
    
    // Check for rate limiting - implement exponential backoff
    const MAX_RETRIES = 3;
    let retries = 0;
    let lastError = null;
    
    while (retries <= MAX_RETRIES) {
      try {
        const { error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            content: content,
            timestamp: message.timestamp || Math.floor(Date.now() / 1000),
            is_ai: message.isAi
          });
      
        if (error) {
          // Check if it's a rate limit error
          if (error.message?.includes('rate') || error.code === '429' || error.code === 'too_many_requests') {
            retries++;
            if (retries <= MAX_RETRIES) {
              // Exponential backoff
              const delay = Math.pow(2, retries) * 500;
              console.log(`Rate limited by Supabase, retrying in ${delay}ms (attempt ${retries}/${MAX_RETRIES})...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          console.error('Error inserting message:', error); // Log the full error
          throw error;
        }
        
        console.log('Message saved successfully');
        return true;
      } catch (err) {
        lastError = err;
        // Only retry on network errors or rate limits
        if (err instanceof Error && 
            (err.message.includes('network') || 
             err.message.includes('timeout') || 
             err.message.includes('rate'))) {
          retries++;
          if (retries <= MAX_RETRIES) {
            const delay = Math.pow(2, retries) * 500;
            console.log(`Error saving message, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        break;
      }
    }
    
    console.error('Error saving message after retries:', lastError); // Log the full error
    console.error("Error saving message:", lastError);
    if (lastError instanceof Error) {
      console.error("Detailed Error:", JSON.stringify(lastError, null, 2));
    }
    return false;
  } catch (error) {
    console.error('Error saving message:', error); // Log the full error
    console.error("Error saving message:", error);
    if (error instanceof Error) {
      console.error("Detailed Error:", JSON.stringify(error, null, 2));
    }
    return false;
  }
}

// Default limit for conversations to fetch (to stay within free tier limits)
const DEFAULT_CONVERSATION_LIMIT = 50;

/**
 * Get user conversations with pagination support to stay within Supabase free tier limits
 * @param userId The user ID to fetch conversations for
 * @param limit Maximum number of conversations to fetch (default: 50)
 * @param page Page number for pagination (default: 1)
 */
export async function getUserConversations(
  userId: string, 
  limit: number = DEFAULT_CONVERSATION_LIMIT, 
  page: number = 1
): Promise<Conversation[]> {
  try {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Apply reasonable limits to avoid excessive data transfer
    const safeLimit = Math.min(limit, 100); // Never fetch more than 100 at once
    
    const { data, error } = await supabase
      .from('conversations')
      .select('id, video_id, video_title, created_at, last_updated_at')
      .eq('user_id', userId)
      .order('last_updated_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);
    
    if (error) {
      console.error('Error fetching conversations:', error); // Log the full error
      return [];
    }
    
    // Add client-side caching with localStorage for frequently accessed conversations
    if (data.length > 0 && typeof window !== 'undefined') {
      try {
        // Only cache the first page of results
        if (page === 1) {
          localStorage.setItem(
            `user_conversations_${userId}`, 
            JSON.stringify({
              timestamp: Date.now(),
              data: data
            })
          );
        }
      } catch (e) {
        // Ignore localStorage errors
        console.warn('Failed to cache conversations in localStorage:', e);
      }
    }
    
    return data.map(conv => ({
      id: conv.id,
      videoId: conv.video_id,
      videoTitle: conv.video_title,
      createdAt: conv.created_at,
      lastUpdatedAt: conv.last_updated_at
    }));
  } catch (error) {
    console.error('Error in getUserConversations:', error); // Log the full error
    return [];
  }
}

// Default limit for messages to fetch (to stay within free tier limits)
const DEFAULT_MESSAGE_LIMIT = 100;

/**
 * Get conversation messages with pagination support to stay within Supabase free tier limits
 * @param conversationId The conversation ID to fetch messages for
 * @param limit Maximum number of messages to fetch (default: 100)
 * @param page Page number for pagination (default: 1)
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = DEFAULT_MESSAGE_LIMIT,
  page: number = 1
): Promise<Message[]> {
  try {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Apply reasonable limits to avoid excessive data transfer
    const safeLimit = Math.min(limit, 200); // Never fetch more than 200 at once
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + safeLimit - 1);
    
    if (error) {
      console.error('Error fetching messages:', error); // Log the full error
      return [];
    }
    
    // Add client-side caching with localStorage for frequently accessed messages
    if (data.length > 0 && typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `conversation_messages_${conversationId}_${page}`, 
          JSON.stringify({
            timestamp: Date.now(),
            data: data
          })
        );
      } catch (e) {
        // Ignore localStorage errors
        console.warn('Failed to cache messages in localStorage:', e);
      }
    }
    
    return data.map((msg, index) => {
      let messageContent = msg.content;
      try {
        // Try to parse the content as JSON (for complex message objects)
        const parsedContent = JSON.parse(msg.content);
        if (typeof parsedContent === 'object' && parsedContent !== null) {
          return {
            id: Date.now() + index, // Use unique IDs for the UI
            user: parsedContent.user || (msg.is_ai ? 'AI Assistant' : 'You'),
            text: parsedContent.text || msg.content,
            timestamp: parsedContent.timestamp || msg.timestamp || 0,
            isAi: msg.is_ai
          };
        }
      } catch {
        // If parsing fails, use the content as is
        messageContent = msg.content;
      }
      
      return {
        id: Date.now() + index, // Use unique IDs for the UI
        user: msg.is_ai ? 'AI Assistant' : 'You',
        text: messageContent,
        timestamp: msg.timestamp || 0,
        isAi: msg.is_ai
      };
    });
  } catch (error) {
    console.error('Error in getConversationMessages:', error); // Log the full error
    return [];
  }
}