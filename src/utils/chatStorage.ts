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
      console.error('Error finding existing conversation:', findError);
      throw findError;
    }
    
    if (existingData) {
      console.log('Updating existing conversation:', existingData.id);
      const { data: updateData, error: updateError } = await supabase
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
          // Let Supabase handle timestamps with defaults
        })
        .select();
      
      if (insertError) {
        console.error('Error inserting conversation:', insertError);
        throw insertError;
      }
      
      console.log('Created conversation:', insertData?.[0]?.id);
      return insertData?.[0]?.id || null;
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
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
    console.error('Error deleting conversation:', error);
    return false;
  }
}

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
    
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: typeof message.text === 'string' ? message.text : JSON.stringify(message),
        timestamp: message.timestamp || Math.floor(Date.now() / 1000),
        is_ai: message.isAi
      });
  
    if (error) {
      console.error('Error inserting message:', error);
      throw error;
    }
    
    console.log('Message saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving message:', error);
    return false;
  }
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, video_id, video_title, created_at, last_updated_at')
    .eq('user_id', userId)
    .order('last_updated_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
  
  return data.map(conv => ({
    id: conv.id,
    videoId: conv.video_id,
    videoTitle: conv.video_title,
    createdAt: conv.created_at,
    lastUpdatedAt: conv.last_updated_at
  }));
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
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
    } catch (e) {
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
}