import type { EmailStats } from '../../types/email';

type Props = { stats: EmailStats };

export function EmailStatsPanel({ stats }: Props) {
  const DAILY_CAP = 100;
  const capPct = Math.min(100, Math.round((stats.sentToday / DAILY_CAP) * 100));

  return (
    <div>
      {/* Top row — 4 main stats */}
      <section className="stats-grid" aria-label="Email statistics" style={{ marginBottom: 16 }}>
        <StatBox label="Total Leads" value={stats.totalLeads} sub="In database" color="var(--nexus-primary)" />
        <StatBox label="Active" value={stats.activeLeads} sub="Awaiting follow-up" color="var(--nexus-secondary)" />
        <StatBox label="Replied" value={stats.repliedLeads} sub="Responded to outreach" color="#16a34a" />
        <StatBox label="Emails Sent" value={stats.totalSent} sub="All time" color="var(--nexus-accent)" />
      </section>

      {/* Pipeline row */}
      <div style={{
        background: 'var(--nexus-surface)',
        border: '1px solid var(--nexus-border)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.06em', color: 'var(--nexus-muted)', textTransform: 'uppercase' }}>
            Follow-up Pipeline
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--nexus-muted)' }}>
            Sent today: <strong style={{ color: stats.sentToday >= DAILY_CAP ? '#ef4444' : 'var(--nexus-primary)' }}>
              {stats.sentToday} / {DAILY_CAP}
            </strong>
            {stats.sentToday >= DAILY_CAP && (
              <span style={{ color: '#ef4444', marginLeft: 6 }}>⚠ Daily cap reached</span>
            )}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <PipelineStep
            step={1}
            label="Step 1 — First Email"
            count={stats.step1Pending}
            sub="Never contacted"
            color="#3b82f6"
            tab="step1"
          />
          <PipelineStep
            step={2}
            label="Step 2 — Follow-up"
            count={stats.step2Pending}
            sub="Step 1 sent"
            color="#8b5cf6"
            tab="step2"
          />
          <PipelineStep
            step={3}
            label="Step 3 — Final"
            count={stats.step3Pending}
            sub="Step 2 sent"
            color="#f59e0b"
            tab="step3"
          />
          <PipelineStep
            step={null}
            label="Sequence Done"
            count={stats.allStepsDone}
            sub="All 3 sent"
            color="#64748b"
            tab="done"
          />
        </div>

        {/* Daily cap progress bar */}
        {stats.sentToday > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 4, background: 'var(--nexus-border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${capPct}%`,
                background: capPct >= 100 ? '#ef4444' : capPct > 70 ? '#f59e0b' : '#16a34a',
                borderRadius: 2,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--nexus-muted)' }}>
              {DAILY_CAP - stats.sentToday > 0
                ? `${DAILY_CAP - stats.sentToday} emails remaining in today's budget`
                : 'Daily budget exhausted — sequencer will resume tomorrow'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div style={{
      background: 'var(--nexus-surface)',
      border: '1px solid var(--nexus-border)',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--nexus-muted)', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ margin: '0 0 4px', fontSize: '2rem', fontWeight: 900, color: 'var(--nexus-primary)', lineHeight: 1 }}>
        {value.toLocaleString()}
      </p>
      <p style={{ margin: 0, fontSize: '0.8rem', color }}>
        {sub}
      </p>
    </div>
  );
}

function PipelineStep({ step, label, count, sub, color, tab }: {
  step: number | null; label: string; count: number; sub: string; color: string; tab: string;
}) {
  return (
    <a
      href={`/email/leads?tab=${tab}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        background: 'var(--nexus-bg)',
        border: `1px solid ${color}30`,
        borderRadius: 8,
        padding: '12px 14px',
        borderLeft: `3px solid ${color}`,
        cursor: 'pointer',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 4px 12px ${color}25`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = '';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '';
      }}
    >
      {step !== null && (
        <span style={{
          display: 'inline-block',
          background: color + '20',
          color,
          fontWeight: 800,
          fontSize: '0.7rem',
          padding: '1px 7px',
          borderRadius: 10,
          marginBottom: 6,
          letterSpacing: '0.04em',
        }}>
          STEP {step}
        </span>
      )}
      {step === null && (
        <span style={{
          display: 'inline-block',
          background: color + '20',
          color,
          fontWeight: 800,
          fontSize: '0.7rem',
          padding: '1px 7px',
          borderRadius: 10,
          marginBottom: 6,
        }}>
          ✓ DONE
        </span>
      )}
      <p style={{ margin: '0 0 2px', fontSize: '1.6rem', fontWeight: 900, color: 'var(--nexus-primary)', lineHeight: 1 }}>
        {count}
      </p>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--nexus-muted)' }}>{sub}</p>
      <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color, fontWeight: 700, opacity: 0.7 }}>
        View leads →
      </p>
    </a>
  );
}
