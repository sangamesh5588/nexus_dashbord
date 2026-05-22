'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  userId: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  userId: null,
  isLoading: true,
  signOut: async () => {},
  authFetch: (url, init) => fetch(url, init),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Keep a ref so authFetch always uses the latest token without triggering re-renders
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      sessionRef.current = s;
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      sessionRef.current = s;
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    window.localStorage.removeItem('nexus_local_auth');
    window.location.href = '/login';
  }

  // Stable function reference — always reads the latest token via ref
  const authFetch = useCallback((url: string, init: RequestInit = {}): Promise<Response> => {
    const token = sessionRef.current?.access_token;
    const headers = new Headers((init.headers as HeadersInit | undefined) ?? {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  }, []); // empty deps — intentional, reads token from ref at call time

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userId: user?.id ?? null,
      isLoading,
      signOut,
      authFetch,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
