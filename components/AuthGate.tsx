'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { isSupabaseConfigured } from '../lib/supabase';

const PUBLIC_PATHS = ['/login', '/auth'];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    if (isLoading) return;
    if (isPublic) return;
    if (!isSupabaseConfigured) return; // local mode — allow through

    const isLocalAuth =
      typeof window !== 'undefined' && window.localStorage.getItem('nexus_local_auth') === 'true';

    if (!user && !isLocalAuth) {
      router.replace('/login?next=' + encodeURIComponent(pathname));
    }
  }, [user, isLoading, isPublic, router, pathname]);

  // Show a blank loading screen only on protected routes while checking auth
  if (isLoading && isSupabaseConfigured && !isPublic) {
    return (
      <div
        style={{
          display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
          color: 'var(--nexus-muted)', fontSize: '0.95rem',
        }}
      >
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
