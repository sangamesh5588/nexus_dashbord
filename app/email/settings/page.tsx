'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { SettingsForm } from '../../../components/email/SettingsForm';

function SettingsContent() {
  const searchParams = useSearchParams();
  const oauthStatus = searchParams.get('oauth');

  return (
    <div className="container">
      <section className="page-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Email Settings</h1>
          <p className="lede">
            Connect your Gmail, configure your sending credentials, and write your AI persona bio.
          </p>
        </div>
        <a className="button button-secondary" href="/email" style={{ flexShrink: 0, textDecoration: 'none' }}>
          ← Back to Dashboard
        </a>
      </section>

      <div style={{ maxWidth: 640 }}>
        <SettingsForm oauthStatus={oauthStatus} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard-main">
        <Suspense fallback={<div className="container"><div className="empty-state">Loading settings…</div></div>}>
          <SettingsContent />
        </Suspense>
      </main>
    </div>
  );
}
