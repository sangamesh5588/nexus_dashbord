'use client';

import { FormEvent, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(searchParams.get('error'));

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setIsSubmitting(false);
    }
    // On success the page navigates away — no need to reset isSubmitting
  }

  async function handleLocalLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    if (email === 'admin@nexus.local' && password === 'nexus123') {
      window.localStorage.setItem('nexus_local_auth', 'true');
      router.replace(searchParams.get('next') || '/dashboard');
      return;
    }

    setIsSubmitting(false);
    setError('Use admin@nexus.local / nexus123 in local mode.');
  }

  if (isSupabaseConfigured) {
    return (
      <main className="login-main">
        <section className="login-panel">
          <p className="eyebrow">Nexus Access</p>
          <h1>Sign in to Nexus</h1>
          <p className="lede">
            Sign in with Google. Each account gets its own leads, campaigns, and email settings — fully isolated.
          </p>

          {message && <div className="status-message">{message}</div>}
          {error && <div className="status-message status-error">{error}</div>}

          <button
            className="button"
            type="button"
            disabled={isSubmitting}
            onClick={handleGoogleSignIn}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
              fontSize: '1rem', padding: '13px 24px', marginTop: 8,
            }}
          >
            <GoogleIcon />
            {isSubmitting ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>
        </section>
      </main>
    );
  }

  // Local-mode fallback (Supabase not configured)
  return (
    <main className="login-main">
      <section className="login-panel">
        <p className="eyebrow">Nexus Access</p>
        <h1>Sign in</h1>
        <p className="lede">Local setup mode: use admin@nexus.local with password nexus123.</p>

        <form className="form-grid" onSubmit={handleLocalLogin}>
          {message ? <div className="status-message">{message}</div> : null}
          {error ? <div className="status-message status-error">{error}</div> : null}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="login-main">
          <section className="login-panel">
            <p className="eyebrow">Nexus Access</p>
            <h1>Loading sign in</h1>
          </section>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
