// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/app/lib/supabase/client'; // Use browser client
import { useRouter } from 'next/navigation'; // Import useRouter

interface AuthContextType {
  user: User | null;
  session: Session | null;
  supabase: SupabaseClient;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient(); // Initialize browser client
  const router = useRouter(); // Initialize router
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Function to get the session and set initial state
    const getSession = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        // Optional: Clear any other user-related state here if needed
        router.push('/'); // Redirect on sign out
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, router]); // Re-run effect if supabase.auth instance changes (shouldn't often)

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent', // Force consent screen for refresh token
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      // Optionally show an error message to the user
    }
  };

  const signOut = useCallback(async () => {
    setIsLoading(true); // Optional: Indicate loading during sign out
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      // Optionally show an error message to the user
      setIsLoading(false);
    } else {
      // Redirect is now handled by the onAuthStateChange listener
      // No need to explicitly push here anymore, but you could if the listener approach fails
      // setIsLoading(false); // Listener will set loading to false
    }
  }, [supabase]);

  const value = {
    user,
    session,
    supabase,
    isLoading,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
