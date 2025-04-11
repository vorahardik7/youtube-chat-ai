# YouTube Chat AI

An AI-powered chat application that allows users to have interactive conversations about YouTube videos, with support for timestamps and transcript integration.

## Features

- Chat with AI about YouTube videos
- Timestamp support for referencing specific parts of videos
- Transcript integration for more accurate responses
- User authentication with Clerk
- Conversation history storage with Supabase
- Responsive design for mobile and desktop

## Setup

### Prerequisites

- Node.js 18+ and npm/pnpm
- Clerk account for authentication
- Supabase account for database
- Google AI (Gemini) API key

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google AI (Gemini)
GEMINI_API_KEY=your_gemini_api_key
```

### Supabase Setup

Create the following tables in your Supabase project:

```sql
-- Conversations table (one per video)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  video_title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Messages table (individual messages in conversations)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp INTEGER,
  is_ai BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

### Installation

```bash
# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Usage

1. Sign in with your Google account
2. Paste a YouTube video URL on the homepage
3. Chat with the AI about the video content
4. Click on timestamps to jump to specific parts of the video
5. View your conversation history in the sidebar or history page

## Deployment

This application can be deployed on Vercel:

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add the environment variables in the Vercel project settings
4. Deploy the application

## Technologies Used

- Next.js 15 with App Router
- React 18
- TypeScript
- Clerk for authentication
- Supabase for database
- Google AI (Gemini) for AI chat
- TailwindCSS for styling
- YouTube API for video integration
