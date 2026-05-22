'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import type { MessageTemplate } from '../../types/email';

type Props = {
  step: 1 | 2 | 3;
  leadCount: number;
  onClose: () => void;
  onSent: () => void;
  leadIds: string[];
};

const STEP_COLOR: Record<number, string> = {
  1: '#6366f1',
  2: '#a855f7',
  3: '#f59e0b',
};

function renderPreview(text: string): string {
  return text
    .replace(/\{\{name\}\}/g, 'Alex')
    .replace(/\{\{company\}\}/g, 'Acme Corp')
    .replace(/\{\{custom_note\}\}/g, 'met at the Dubai expo');
}

export function TemplatePicker({ step, leadCount, onClose, onSent, leadIds }: Props) {
  const { authFetch } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const [tab, setTab] = useState<'all' | 'default' | 'custom'>('all');

  useEffect(() => {
    authFetch('/api/email/templates')
      .then((r) => r.json())
      .then((d: { templates?: MessageTemplate[] }) => {
        const forStep = (d.templates ?? []).filter((t) => t.step === step);
        setTemplates(forStep);
        const firstDefault = forStep.find((t) => t.is_default);
        if (firstDefault) setSelectedId(firstDefault.id);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [step]);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const visible = templates.filter((t) => {
    if (tab === 'default') return t.is_default;
    if (tab === 'custom') return !t.is_default;
    return true;
  });

  async function handleSend() {
    if (!selectedId) return;
    setSending(true);
    try {
      const res = await authFetch('/api/email/send-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, templateId: selectedId, step }),
      });
      const data = await res.json() as { sent?: number; failed?: number; skipped?: number; errors?: string[]; error?: string };
      // API-level error (e.g. Gmail not configured)
      if (!res.ok || data.error) {
        setResult({ sent: 0, failed: leadCount, errors: [data.error ?? 'Send failed.'] });
        return;
      }
      setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0, errors: data.errors ?? [] });
      if ((data.sent ?? 0) > 0) onSent();
    } catch {
      setResult({ sent: 0, failed: leadCount, errors: ['Network error — check your connection.'] });
    } finally {
      setSending(false);
    }
  }

  const color = STEP_COLOR[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 880,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Follow-up {step}
            </p>
            <h2 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800 }}>
              Select a template — sending to {leadCount} lead{leadCount !== 1 ? 's' : ''}
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem',
            color: '#9ca3af', lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        {result ? (
          /* ── Result screen ────────────────────────────────────────────── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 }}>
            <div style={{ fontSize: '3rem' }}>{result.failed === 0 ? '✅' : '⚠️'}</div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
              {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ''}
            </h3>
            {result.errors.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', maxWidth: 500, width: '100%' }}>
                {result.errors.slice(0, 5).map((e, i) => (
                  <p key={i} style={{ margin: '2px 0', fontSize: '0.8rem', color: '#dc2626' }}>{e}</p>
                ))}
              </div>
            )}
            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
              {result.sent > 0 ? 'Leads have moved to the next follow-up stage.' : ''}
            </p>
            <button className="button" onClick={onClose} style={{ marginTop: 8 }}>Done</button>
          </div>
        ) : (
          /* ── Picker layout ────────────────────────────────────────────── */
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Left — template list */}
            <div style={{
              width: 300, flexShrink: 0, borderRight: '1px solid #e5e7eb',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* filter tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 12px' }}>
                {(['all', 'default', 'custom'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '10px 10px', fontSize: '0.78rem', fontWeight: tab === t ? 800 : 500,
                    color: tab === t ? color : '#9ca3af',
                    borderBottom: tab === t ? `2px solid ${color}` : '2px solid transparent',
                    marginBottom: -1,
                  }}>
                    {t === 'default' ? '⭐ High Conversion' : t === 'custom' ? 'Custom' : 'All'}
                  </button>
                ))}
              </div>

              {/* list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading ? (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', padding: 8 }}>Loading…</p>
                ) : visible.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', padding: 8 }}>No templates yet.</p>
                ) : visible.map((t) => {
                  const isSelected = t.id === selectedId;
                  return (
                    <button key={t.id} type="button" onClick={() => setSelectedId(t.id)} style={{
                      textAlign: 'left', background: isSelected ? `${color}12` : '#f9fafb',
                      border: `1.5px solid ${isSelected ? color : '#e5e7eb'}`,
                      borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {t.is_default && (
                          <span style={{
                            background: '#fef3c7', color: '#92400e',
                            fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: 20,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                          }}>⭐ HC</span>
                        )}
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? color : '#111827' }}>
                          {t.name}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.subject}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right — preview */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {selected ? (
                  <>
                    <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Preview (sample data)
                    </p>
                    <div style={{
                      background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20,
                    }}>
                      <p style={{ margin: '0 0 12px', fontSize: '0.8rem' }}>
                        <span style={{ color: '#6b7280' }}>Subject: </span>
                        <strong>{renderPreview(selected.subject)}</strong>
                      </p>
                      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
                      <pre style={{
                        margin: 0, fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: 1.7,
                        whiteSpace: 'pre-wrap', color: '#374151',
                      }}>
                        {renderPreview(selected.body)}
                      </pre>
                    </div>
                    <p style={{ margin: '12px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                      Placeholders: <code>{'{{name}}'}</code>, <code>{'{{company}}'}</code>, <code>{'{{custom_note}}'}</code> — replaced with real lead data when sending.
                    </p>
                  </>
                ) : (
                  <div style={{ color: '#9ca3af', fontSize: '0.9rem', paddingTop: 40, textAlign: 'center' }}>
                    Select a template to preview it here.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '16px 24px', borderTop: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
              }}>
                <button type="button" onClick={onClose} style={{
                  background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 8,
                  padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                }}>
                  Cancel
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={!selectedId || sending}
                  onClick={handleSend}
                  style={{ minWidth: 160 }}
                >
                  {sending ? 'Sending…' : `Send to ${leadCount} lead${leadCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
