'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { EmailStatsPanel } from '../../components/email/EmailStatsPanel';
import { RecentActivityFeed } from '../../components/email/RecentActivityFeed';
import { useAuth } from '../../lib/auth-context';
import type { EmailStats, EmailLog } from '../../types/email';

type ActivityItem = EmailLog & { lead_email: string; lead_name: string | null };

const defaultStats: EmailStats = {
  totalLeads: 0, activeLeads: 0, repliedLeads: 0, totalSent: 0,
  step1Pending: 0, step2Pending: 0, step3Pending: 0, allStepsDone: 0, sentToday: 0,
};

export default function EmailPage() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState<EmailStats>(defaultStats);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  async function loadStats() {
    try {
      const res = await authFetch('/api/email/stats');
      const data = await res.json() as { stats?: EmailStats; recentActivity?: ActivityItem[] };
      if (data.stats) setStats(data.stats);
      if (data.recentActivity) setActivity(data.recentActivity);
    } catch { /* silent */ }
  }

  useEffect(() => {
    loadStats();
    const interval = window.setInterval(loadStats, 30000);
    return () => window.clearInterval(interval);
  }, []);

  async function handleRunSequencer() {
    setIsRunning(true);
    setRunResult(null);
    setRunError(null);
    try {
      const res = await authFetch('/api/email/run', { method: 'POST' });
      const data = await res.json() as { result?: { sent: number; skipped: number; errors: string[] }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Run failed.');
      const r = data.result!;
      setRunResult(`✓ Sent ${r.sent} email(s), skipped ${r.skipped} step(s).${r.errors.length > 0 ? ` Errors: ${r.errors.join('; ')}` : ''}`);
      loadStats();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Run failed.');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard-main">
        <div className="container">
          <section className="page-header">
            <div>
              <p className="eyebrow">Outreach control</p>
              <h1>Email Automation</h1>
              <p className="lede">
                Upload leads, configure follow-up sequences, and send personalised outreach at scale.
              </p>
            </div>
            <nav className="nav-links" style={{ flexShrink: 0 }}>
              <a className="button button-accent" href="/email/generate-leads" style={{ textDecoration: 'none' }}>+ Generate Leads</a>
              <a className="nav-link" href="/email/leads">Leads</a>
              <a className="nav-link" href="/email/campaigns">Campaigns</a>
              <a className="nav-link" href="/email/settings">Settings</a>
            </nav>
          </section>

          <EmailStatsPanel stats={stats} />

          <div className="content-grid">
            <div>
              <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800 }}>Recent Activity</h2>
              <RecentActivityFeed items={activity} />
            </div>

            <aside className="side-panel">
              <div className="form-panel form-grid">
                <p className="fieldset-label" style={{ margin: 0 }}>Run Automation</p>

                {runResult ? <div className="status-message">{runResult}</div> : null}
                {runError ? <div className="status-message status-error">{runError}</div> : null}

                <button className="button" type="button" disabled={isRunning} onClick={handleRunSequencer}>
                  {isRunning ? 'Sending…' : '▶ Run Sequencer Now'}
                </button>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--nexus-muted)' }}>
                  Sends follow-up emails to all eligible leads based on your campaign templates.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
