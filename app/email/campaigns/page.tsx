'use client';

import { useState } from 'react';
import { Navbar } from '../../../components/Navbar';
import { CampaignEditor } from '../../../components/email/CampaignEditor';
import { TemplateLibrary } from '../../../components/email/TemplateLibrary';

type Tab = 'sequences' | 'templates';

export default function CampaignsPage() {
  const [tab, setTab] = useState<Tab>('templates');

  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard-main">
        <div className="container">
          <section className="page-header">
            <div>
              <p className="eyebrow">Outreach sequences</p>
              <h1>Campaigns & Templates</h1>
              <p className="lede">
                Build a library of named templates for each follow-up stage. Select leads, pick a template, and send in one click.
              </p>
            </div>
            <a className="button button-secondary" href="/email" style={{ flexShrink: 0, textDecoration: 'none' }}>
              ← Back to Dashboard
            </a>
          </section>

          {/* ── Tab switcher ────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 28,
            borderBottom: '2px solid var(--nexus-border)', paddingBottom: 0,
          }}>
            {([
              { key: 'templates', label: 'Template Library', color: '#6366f1' },
              { key: 'sequences', label: 'Auto Sequences',  color: '#a855f7' },
            ] as { key: Tab; label: string; color: string }[]).map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '10px 18px', fontSize: '0.9rem',
                    fontWeight: active ? 800 : 500,
                    color: active ? t.color : 'var(--nexus-muted)',
                    borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
                    marginBottom: -2, transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === 'templates' ? (
            <TemplateLibrary />
          ) : (
            <>
              <p style={{ color: '#6b7280', fontSize: '0.88rem', marginBottom: 24, marginTop: -12 }}>
                Auto sequences run daily via the sequencer. Configure up to 3 steps with delay days between each.
                Use <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{'{{name}}'}</code>,{' '}
                <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{'{{company}}'}</code>,{' '}
                <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{'{{custom_note}}'}</code>{' '}
                to personalise.
              </p>
              <CampaignEditor />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
