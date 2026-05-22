'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '../../lib/auth-context';
import type { LeadWithStep, LeadTab } from '../../types/email';
import { TemplatePicker } from './TemplatePicker';

type TabConfig  = { key: LeadTab; label: string; color: string };
type DateFilter = 'all' | 'today' | '7d' | '30d' | '90d';
type StatusFilter = 'all' | 'active' | 'replied' | 'spam';

const TABS: TabConfig[] = [
  { key: 'all',   label: 'All',         color: '#6b7280' },
  { key: 'step1', label: 'Follow-up 1', color: '#6366f1' },
  { key: 'step2', label: 'Follow-up 2', color: '#a855f7' },
  { key: 'step3', label: 'Follow-up 3', color: '#f59e0b' },
  { key: 'done',  label: 'Done',        color: '#22c55e' },
  { key: 'spam',  label: 'Spam',        color: '#ef4444' },
];

const STATUS_COLOR: Record<string, string> = {
  active:       '#6366f1',
  replied:      '#22c55e',
  unsubscribed: '#9ca3af',
  spam:         '#ef4444',
};

const STEP_LABEL: Record<number, string> = {
  1: 'Step 1 sent',
  2: 'Step 2 sent',
  3: 'Step 3 sent',
};

const TAB_STEP: Partial<Record<LeadTab, 1 | 2 | 3>> = {
  step1: 1,
  step2: 2,
  step3: 3,
};

const DATE_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: 'all',  label: 'All time'    },
  { key: 'today',label: 'Today'       },
  { key: '7d',   label: 'Last 7 days' },
  { key: '30d',  label: 'Last 30 days'},
  { key: '90d',  label: 'Last 90 days'},
];

const STATUS_OPTIONS: { key: StatusFilter; label: string; color: string }[] = [
  { key: 'all',     label: 'All Status', color: '#6b7280' },
  { key: 'active',  label: 'Active',     color: '#6366f1' },
  { key: 'replied', label: 'Replied',    color: '#22c55e' },
  { key: 'spam',    label: 'Spam',       color: '#ef4444' },
];

function dateCutoff(filter: DateFilter): number {
  const now = Date.now();
  if (filter === 'today') {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }
  if (filter === '7d')  return now - 7  * 86400_000;
  if (filter === '30d') return now - 30 * 86400_000;
  if (filter === '90d') return now - 90 * 86400_000;
  return 0;
}

type Props = {
  leads: LeadWithStep[];
  counts: Record<LeadTab, number>;
  activeTab: LeadTab;
  onTabChange: (tab: LeadTab) => void;
  onLeadUpdated: () => void;
  emptyMessage?: string;
};

export function LeadTable({ leads, counts, activeTab, onTabChange, onLeadUpdated, emptyMessage }: Props) {
  const { authFetch } = useAuth();

  // ── sort / filter state ─────────────────────────────────────────────────────
  const [sortAsc,      setSortAsc]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [dateFilter,   setDateFilter]   = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // ── selection state ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPicker,  setShowPicker]  = useState(false);
  const [pendingId,   setPendingId]   = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function handleTabChange(tab: LeadTab) {
    setSelectedIds(new Set());
    setSearch('');
    setDateFilter('all');
    setStatusFilter('all');
    onTabChange(tab);
  }

  // ── filtered + sorted view ──────────────────────────────────────────────────
  const visible = useMemo(() => {
    const cutoff = dateCutoff(dateFilter);
    const q = search.toLowerCase().trim();

    return [...leads]
      .filter((l) => {
        if (q && !(
          (l.name    ?? '').toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.company ?? '').toLowerCase().includes(q)
        )) return false;
        if (dateFilter !== 'all' && new Date(l.created_at).getTime() < cutoff) return false;
        if (statusFilter !== 'all' && l.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sortAsc ? da - db : db - da;
      });
  }, [leads, search, dateFilter, statusFilter, sortAsc]);

  // ── selection helpers ───────────────────────────────────────────────────────
  const allSelected = visible.length > 0 && visible.every((l) => selectedIds.has(l.id));

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(visible.map((l) => l.id)));
  }
  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
    });
  }

  // ── single-lead spam / restore ──────────────────────────────────────────────
  async function setStatus(leadId: string, status: 'spam' | 'active') {
    setPendingId(leadId);
    setActionError(null);
    try {
      const res = await authFetch(`/api/email/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setActionError(data.error ?? `Failed (${res.status}). Check your connection and try again.`);
        return;
      }
      onLeadUpdated();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Network error — could not update lead.');
    } finally {
      setPendingId(null);
    }
  }

  // ── bulk spam ───────────────────────────────────────────────────────────────
  async function bulkSpam() {
    if (selectedIds.size === 0) return;
    setBulkPending(true);
    setActionError(null);
    try {
      const results = await Promise.all(
        [...selectedIds].map((id) =>
          authFetch(`/api/email/leads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'spam' }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        setActionError(`${failed} lead(s) could not be updated. You may need to sign in again.`);
      }
      setSelectedIds(new Set());
      onLeadUpdated();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Network error — could not update leads.');
    } finally {
      setBulkPending(false);
    }
  }

  const sendStep   = TAB_STEP[activeTab];
  const canSend    = sendStep !== undefined && selectedIds.size > 0;
  const canSpam    = activeTab !== 'spam' && selectedIds.size > 0;
  const showBar    = canSend || (canSpam && selectedIds.size > 0);
  const selectedList = visible.filter((l) => selectedIds.has(l.id)).map((l) => l.id);
  const stepColor  = sendStep
    ? ({ 1: '#6366f1', 2: '#a855f7', 3: '#f59e0b' } as Record<number, string>)[sendStep]
    : '#6366f1';

  const activeFilters = search || dateFilter !== 'all' || statusFilter !== 'all';

  return (
    <div style={{ position: 'relative' }}>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 0,
        borderBottom: '2px solid #e5e7eb',
      }}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button key={t.key} type="button" onClick={() => handleTabChange(t.key)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 14px', fontSize: '0.85rem', fontWeight: active ? 800 : 500,
              color: active ? t.color : '#9ca3af',
              borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t.label}
              <span style={{
                background: active ? `${t.color}20` : '#f3f4f6',
                color: active ? t.color : '#9ca3af',
                borderRadius: 20, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700,
              }}>
                {counts[t.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search + filter bar ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        padding: '14px 0', marginBottom: 4,
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180, maxWidth: 340 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: '#9ca3af', fontSize: '0.9rem', pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            placeholder="Search name, email, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 10,
              padding: '8px 10px 8px 32px',
              border: '1.5px solid #e5e7eb', borderRadius: 8,
              fontSize: '0.85rem', outline: 'none',
              background: search ? '#fafafa' : '#fff',
            }}
          />
        </div>

        {/* Date filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          style={{
            padding: '8px 12px', border: `1.5px solid ${dateFilter !== 'all' ? '#6366f1' : '#e5e7eb'}`,
            borderRadius: 8, fontSize: '0.82rem', cursor: 'pointer', background: '#fff',
            color: dateFilter !== 'all' ? '#6366f1' : '#374151', fontWeight: dateFilter !== 'all' ? 700 : 400,
          }}
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {STATUS_OPTIONS.map((o) => {
            const active = statusFilter === o.key;
            return (
              <button key={o.key} type="button" onClick={() => setStatusFilter(o.key)} style={{
                background: active ? `${o.color}15` : 'none',
                border: `1.5px solid ${active ? o.color : '#e5e7eb'}`,
                color: active ? o.color : '#6b7280',
                borderRadius: 20, padding: '5px 12px',
                fontSize: '0.78rem', fontWeight: active ? 700 : 500, cursor: 'pointer',
                transition: 'all 0.12s',
              }}>
                {o.key === 'replied' ? '↩ Replied' : o.key === 'spam' ? '🚫 Spam' : o.key === 'active' ? '✓ Active' : o.label}
              </button>
            );
          })}
        </div>

        {/* Clear filters */}
        {activeFilters && (
          <button type="button" onClick={() => { setSearch(''); setDateFilter('all'); setStatusFilter('all'); }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, padding: '4px 6px',
            textDecoration: 'underline',
          }}>
            Clear filters
          </button>
        )}

        {/* Result count */}
        <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginLeft: 'auto' }}>
          {visible.length} of {leads.length} leads
        </span>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {actionError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>
            ⚠️ {actionError}
          </span>
          <button type="button" onClick={() => setActionError(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#dc2626', fontSize: '1rem', lineHeight: 1, flexShrink: 0,
          }}>×</button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="empty-state">
          {activeFilters
            ? `No leads match your filters. Try clearing them.`
            : (emptyMessage ?? 'No leads in this category.')}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: showBar ? 72 : 0 }}>
          <table className="lead-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    title="Select all visible"
                    style={{ cursor: 'pointer', width: 15, height: 15 }}
                  />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Step</th>
                <th>Status</th>
                <th
                  onClick={() => setSortAsc((v) => !v)}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                >
                  Added {sortAsc ? '↑' : '↓'}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => (
                <tr key={lead.id} style={{
                  background: selectedIds.has(lead.id) ? 'rgba(99,102,241,0.05)' : undefined,
                }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                      style={{ cursor: 'pointer', width: 15, height: 15 }}
                    />
                  </td>
                  <td style={{ fontWeight: 600 }}>{lead.name ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{lead.email}</td>
                  <td>{lead.company ?? '—'}</td>
                  <td>
                    {lead.max_step != null ? (
                      <span className="badge" style={{
                        background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: '0.72rem',
                      }}>
                        {STEP_LABEL[lead.max_step] ?? `Step ${lead.max_step}`}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>New</span>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: `${STATUS_COLOR[lead.status] ?? '#9ca3af'}18`,
                      color: STATUS_COLOR[lead.status] ?? '#9ca3af',
                      textTransform: 'capitalize',
                    }}>
                      {lead.status}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#9ca3af' }}>
                    {new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {lead.status === 'spam' ? (
                      <button
                        type="button"
                        disabled={pendingId === lead.id}
                        onClick={() => setStatus(lead.id, 'active')}
                        style={{
                          background: 'rgba(34,197,94,0.1)', color: '#16a34a',
                          border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6,
                          padding: '3px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700,
                        }}
                      >
                        {pendingId === lead.id ? '…' : 'Restore'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pendingId === lead.id}
                        onClick={() => setStatus(lead.id, 'spam')}
                        style={{
                          background: 'rgba(239,68,68,0.07)', color: '#dc2626',
                          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
                          padding: '3px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700,
                        }}
                      >
                        {pendingId === lead.id ? '…' : 'Spam'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Sticky action bar ───────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'sticky', bottom: 0,
          background: '#fff',
          borderTop: `2px solid ${canSend ? stepColor : '#ef4444'}`,
          borderRadius: '0 0 12px 12px',
          padding: '11px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', zIndex: 10, gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#374151' }}>
            <span style={{ color: canSend ? stepColor : '#ef4444', fontWeight: 800 }}>
              {selectedIds.size}
            </span>
            {' '}lead{selectedIds.size !== 1 ? 's' : ''} selected
          </span>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setSelectedIds(new Set())} style={{
              background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 8,
              padding: '7px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
            }}>
              Clear
            </button>

            {/* Bulk spam — shown on all non-spam tabs */}
            {activeTab !== 'spam' && (
              <button
                type="button"
                disabled={bulkPending}
                onClick={bulkSpam}
                style={{
                  background: 'rgba(239,68,68,0.08)', color: '#dc2626',
                  border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 8,
                  padding: '7px 16px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                }}
              >
                {bulkPending ? 'Moving…' : `🚫 Mark ${selectedIds.size} as Spam`}
              </button>
            )}

            {/* Send follow-up — only on step tabs */}
            {canSend && (
              <button
                className="button"
                type="button"
                onClick={() => setShowPicker(true)}
                style={{ background: stepColor, fontSize: '0.9rem' }}
              >
                Send Follow-up {sendStep} →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Template picker modal ───────────────────────────────────────────── */}
      {showPicker && sendStep && (
        <TemplatePicker
          step={sendStep}
          leadCount={selectedIds.size}
          leadIds={selectedList}
          onClose={() => setShowPicker(false)}
          onSent={() => {
            setShowPicker(false);
            setSelectedIds(new Set());
            onLeadUpdated();
          }}
        />
      )}
    </div>
  );
}
