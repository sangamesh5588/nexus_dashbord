'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export function Navbar() {
  const { user, signOut } = useAuth();

  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url;
  const displayName: string =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    '';
  const initials = displayName ? displayName[0].toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? '?');

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">N</span>
          <span>Nexus Unified Dashboard</span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          <Link className="nav-link" href="/dashboard">Dashboard</Link>
          <Link className="nav-link" href="/email">Email</Link>
          <Link className="button button-accent" href="/submit">New Post</Link>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                title={displayName || user.email}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--nexus-secondary)',
                  color: '#fff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem',
                  flexShrink: 0, overflow: 'hidden',
                }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : initials}
              </div>
              {displayName && (
                <span style={{
                  fontSize: '0.82rem', color: 'var(--nexus-muted)',
                  maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {displayName}
                </span>
              )}
            </div>
          )}

          <button className="button button-secondary" type="button" onClick={signOut}>
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
