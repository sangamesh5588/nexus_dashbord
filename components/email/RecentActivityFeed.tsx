import type { EmailLog } from '../../types/email';

type ActivityItem = EmailLog & { lead_email: string; lead_name: string | null };

type Props = { items: ActivityItem[] };

const stepLabel = (step: number) => {
  if (step === 0) return 'AI Reply';
  return `Follow-up ${step}`;
};

const statusColor: Record<string, string> = {
  sent: 'var(--nexus-secondary)',
  replied: 'var(--nexus-success)',
  failed: 'var(--nexus-danger)',
};

export function RecentActivityFeed({ items }: Props) {
  if (items.length === 0) {
    return <div className="empty-state">No email activity yet. Run the sequencer to send your first emails.</div>;
  }

  return (
    <div className="activity-feed">
      {items.map((item) => (
        <div key={item.id} className="activity-row">
          <div className="activity-meta">
            <span className="activity-name">{item.lead_name ?? item.lead_email}</span>
            <span style={{ color: 'var(--nexus-muted)', fontSize: '0.82rem' }}>{item.lead_email}</span>
          </div>
          <div className="activity-detail">
            <span className="badge badge-muted">{stepLabel(item.step)}</span>
            <span
              className="badge"
              style={{ background: `${statusColor[item.status]}20`, color: statusColor[item.status] }}
            >
              {item.status}
            </span>
            <span style={{ color: 'var(--nexus-muted)', fontSize: '0.82rem' }}>
              {new Date(item.sent_at).toLocaleDateString()} {new Date(item.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
