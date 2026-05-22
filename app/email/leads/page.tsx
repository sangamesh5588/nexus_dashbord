'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { LeadUploader } from '../../../components/email/LeadUploader';
import { LeadTable } from '../../../components/email/LeadTable';
import { useAuth } from '../../../lib/auth-context';
import type { LeadTab, LeadWithStep } from '../../../types/email';

const VALID_TABS: LeadTab[] = ['all', 'step1', 'step2', 'step3', 'done', 'spam'];

const TAB_TITLES: Record<LeadTab, string> = {
  all:   'All Leads',
  step1: 'Follow-up 1 — Never Contacted',
  step2: 'Follow-up 2 — Step 1 Sent',
  step3: 'Follow-up 3 — Step 2 Sent',
  done:  'Done — All Steps Sent',
  spam:  'Spam / Invalid',
};

const DEFAULT_COUNTS: Record<LeadTab, number> = {
  all: 0, step1: 0, step2: 0, step3: 0, done: 0, spam: 0,
};

export default function LeadsPage() {
  const { authFetch } = useAuth();
  const searchParams = useSearchParams();

  // Read ?tab= from URL, fall back to 'all'
  const urlTab = searchParams.get('tab') as LeadTab | null;
  const initialTab: LeadTab = urlTab && VALID_TABS.includes(urlTab) ? urlTab : 'all';

  const [activeTab, setActiveTab] = useState<LeadTab>(initialTab);
  const [leads, setLeads] = useState<LeadWithStep[]>([]);
  const [counts, setCounts] = useState<Record<LeadTab, number>>(DEFAULT_COUNTS);
  const [isLoading, setIsLoading] = useState(true);

  async function loadLeads(tab: LeadTab) {
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/email/leads?tab=${tab}&counts=true`);
      const data = await res.json() as {
        leads?: LeadWithStep[];
        counts?: Record<LeadTab, number>;
      };
      if (data.leads) setLeads(data.leads);
      if (data.counts) setCounts(data.counts);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }

  // Load on mount with the URL-supplied tab
  useEffect(() => { loadLeads(initialTab); }, []);

  function handleTabChange(tab: LeadTab) {
    setActiveTab(tab);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
    loadLeads(tab);
  }

  const emptyMessages: Record<LeadTab, string> = {
    all:   'No leads yet. Upload an Excel file or generate leads to get started.',
    step1: 'No leads waiting for a first email. All leads have been contacted.',
    step2: 'No leads in Follow-up 2 yet — run the sequencer after Step 1 emails are sent.',
    step3: 'No leads in Follow-up 3 yet — come back once Step 2 emails go out.',
    done:  'No leads have completed the full sequence yet.',
    spam:  'No leads marked as spam.',
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard-main">
        <div className="container">
          <section className="page-header">
            <div>
              <p className="eyebrow">Lead management</p>
              <h1>{TAB_TITLES[activeTab]}</h1>
              <p className="lede">
                Click any pipeline stage on the dashboard to jump straight to those leads. Sorted newest first.
              </p>
            </div>
            <a className="button button-secondary" href="/email" style={{ flexShrink: 0, textDecoration: 'none' }}>
              ← Back to Dashboard
            </a>
          </section>

          <div className="form-panel" style={{ marginBottom: 24, padding: 24 }}>
            <p className="fieldset-label" style={{ margin: '0 0 16px' }}>Upload Excel File</p>
            <LeadUploader onUploaded={() => loadLeads(activeTab)} />
          </div>

          <div>
            {isLoading ? (
              <div className="empty-state">Loading leads…</div>
            ) : (
              <LeadTable
                leads={leads}
                counts={counts}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                emptyMessage={emptyMessages[activeTab]}
                onLeadUpdated={() => loadLeads(activeTab)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
