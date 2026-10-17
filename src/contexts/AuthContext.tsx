import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase/client';
import { setCommunityAuthToken } from '../services/community/api';
import { updateSocketAuth } from '../services/community/socket';


export interface UserProfile {
  id: string;
  email?: string | null;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  refreshProfile: () => Promise<void>;
  hasSavedAvatar: boolean;
  updateAvatar: (avatarData: {
    avatarUrl: string;
    avatarSource?: string;
    avatarMediaId?: string;
    avatarCharacter?: string;
    avatarTitle?: string;
  }) => Promise<{ error: Error | null; profile?: UserProfile }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const openAuthModal = useCallback((mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }
    // Guest or dev fallback
    return {};
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (!session?.access_token) {
      setProfile(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          return;
        }
      }
    } catch {
      // Ignore background refresh errors
    }

    // Fallback to metadata
    if (user) {
      const meta = user.user_metadata || {};
      setProfile({
        id: user.id,
        email: user.email,
        displayName: meta.full_name || meta.name || user.email?.split('@')[0] || 'PopCho Fan',
        avatarUrl: meta.avatar_url || meta.picture || null,
        role: 'Community Member',
      });
    }
  }, [session, user]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    // 1. Initial Session Retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 2. Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const token = session?.access_token || null;
    setCommunityAuthToken(token);
    updateSocketAuth(token);

    if (user && session) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [user, session, refreshProfile]);


  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'),
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName || email.split('@')[0],
          },
        },
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      // Check if email confirmation is required
      const needsConfirmation = !data.session;
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        closeAuthModal();
      }

      return { error: null, needsEmailConfirmation: needsConfirmation };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return { error: new Error(msg) };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'),
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      setSession(data.session);
      setUser(data.user);
      closeAuthModal();
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      return { error: new Error(msg) };
    }
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error: new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'),
      };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      return { error: new Error(msg) };
    }
  };

  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Continue clearing local state regardless
      }
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const updateAvatar = async (avatarData: {
    avatarUrl: string;
    avatarSource?: string;
    avatarMediaId?: string;
    avatarCharacter?: string;
    avatarTitle?: string;
  }) => {
    if (!session?.access_token) {
      return { error: new Error('You must be signed in to save an avatar.') };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(avatarData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save avatar');
      }

      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
      }
      return { error: null, profile: data.profile };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save avatar';
      return { error: new Error(msg) };
    }
  };

  const hasSavedAvatar = Boolean(profile?.avatarUrl && profile.avatarUrl.trim().length > 0);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isSupabaseConfigured,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        getAuthHeaders,
        refreshProfile,
        hasSavedAvatar,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
