'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import type { MessageTemplate } from '../../types/email';

type StepFilter = 'all' | 1 | 2 | 3;

const STEP_COLOR: Record<number, string> = {
  1: '#6366f1',
  2: '#a855f7',
  3: '#f59e0b',
};

const emptyForm = { name: '', step: 1 as 1 | 2 | 3, subject: '', body: '', image_url: null as string | null, image_name: null as string | null };

export function TemplateLibrary() {
  const { authFetch } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StepFilter>('all');
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch('/api/email/templates');
      const data = await res.json() as { templates?: MessageTemplate[] };
      setTemplates(data.templates ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSaveMsg(null);
    setCreating(true);
  }

  function startEdit(t: MessageTemplate) {
    setCreating(false);
    setForm({ name: t.name, step: t.step, subject: t.subject, body: t.body, image_url: t.image_url ?? null, image_name: t.image_name ?? null });
    setSaveMsg(null);
    setEditing(t);
  }

  function cancelForm() {
    setCreating(false);
    setEditing(null);
  }

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await authFetch('/api/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { ...form, id: editing.id } : form),
      });

      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Save failed.');
      setSaveMsg('Saved!');
      await load();
      setTimeout(() => { setCreating(false); setEditing(null); }, 800);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setSaveMsg(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await authFetch('/api/email/templates/upload-image', { method: 'POST', body: fd });
      const data = await res.json() as { url?: string; name?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Upload failed.');
      setForm((p) => ({ ...p, image_url: data.url ?? null, image_name: data.name ?? null }));
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function del(id: string) {
    setDeletingId(id);
    try {
      await authFetch(`/api/email/templates/${id}`, { method: 'DELETE' });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (editing?.id === id) setEditing(null);
    } catch { /* silent */ } finally {
      setDeletingId(null);
    }
  }

  const visible = templates.filter((t) => filter === 'all' || t.step === filter);

  const showForm = creating || editing !== null;

  return (
    <div>
      {/* ── Filter + New button ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 1, 2, 3] as const).map((f) => {
            const active = filter === f;
            const color = typeof f === 'number' ? STEP_COLOR[f] : '#6b7280';
            return (
              <button key={f} type="button" onClick={() => setFilter(f)} style={{
                background: active ? `${color}15` : 'none',
                border: `1.5px solid ${active ? color : '#e5e7eb'}`,
                color: active ? color : '#6b7280',
                borderRadius: 20, padding: '5px 14px',
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              }}>
                {f === 'all' ? 'All Steps' : `Follow-up ${f}`}
              </button>
            );
          })}
        </div>
        <button className="button" type="button" onClick={startCreate} style={{ fontSize: '0.875rem' }}>
          + New Template
        </button>
      </div>

      {/* ── Create / Edit form ───────────────────────────────────────── */}
      {showForm && (
        <div className="form-panel" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800 }}>
            {editing ? `Edit — ${editing.name}` : 'New Template'}
          </h3>
          <div className="form-grid">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label>Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. Real Estate — Cold Outreach"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Follow-up Step</label>
                <select
                  value={form.step}
                  onChange={(e) => setForm((p) => ({ ...p, step: Number(e.target.value) as 1 | 2 | 3 }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.9rem' }}
                >
                  <option value={1}>Follow-up 1 — First contact</option>
                  <option value={2}>Follow-up 2 — Second touch</option>
                  <option value={3}>Follow-up 3 — Final note</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Subject Line</label>
              <input
                type="text"
                placeholder="Use {{name}}, {{company}} for personalisation"
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Email Body</label>
              <textarea
                rows={10}
                placeholder={`Hi {{name}},\n\nYour message here…\n\nPlaceholders: {{name}}, {{company}}, {{custom_note}}`}
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              />
            </div>

            {/* Image attachment */}
            <div className="field">
              <label>Attach Image <span style={{ fontWeight: 400, color: 'var(--nexus-muted)', fontSize: '0.78rem' }}>— optional, shown at bottom of email</span></label>
              {form.image_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
                  <img src={form.image_url} alt="preview" style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.image_name ?? 'Image'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#16a34a' }}>✓ Will be embedded in email</p>
                  </div>
                  <button type="button" onClick={() => setForm((p) => ({ ...p, image_url: null, image_name: null }))} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', flexShrink: 0 }}>
                    Remove
                  </button>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: '2px dashed #e5e7eb', borderRadius: 8, cursor: uploading ? 'wait' : 'pointer', background: '#fafafa', transition: 'border-color 0.15s' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) uploadImage(f); }}
                >
                  <span style={{ fontSize: '1.4rem' }}>🖼</span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {uploading ? '⟳ Uploading…' : 'Click or drag an image here (max 5 MB)'}
                  </span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }}
                  />
                </label>
              )}
            </div>

            {saveMsg && (
              <div className={`status-message${saveMsg === 'Saved!' ? '' : ' status-error'}`}>
                {saveMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="button" type="button" disabled={saving} onClick={save}>
                {saving ? 'Saving…' : 'Save Template'}
              </button>
              <button type="button" onClick={cancelForm} style={{
                background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 8,
                padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template cards ───────────────────────────────────────────── */}
      {loading ? (
        <div className="empty-state">Loading templates…</div>
      ) : visible.length === 0 ? (
        <div className="empty-state">No templates yet. Click "+ New Template" to create one.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {visible.map((t) => {
            const color = STEP_COLOR[t.step];
            const isEditingThis = editing?.id === t.id;
            return (
              <div key={t.id} className="form-panel" style={{
                padding: 20,
                border: isEditingThis ? `2px solid ${color}` : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      background: `${color}15`, color, borderRadius: 20,
                      padding: '2px 10px', fontSize: '0.72rem', fontWeight: 800,
                    }}>
                      Follow-up {t.step}
                    </span>
                    {t.is_default && (
                      <span style={{
                        background: '#fef3c7', color: '#92400e',
                        fontSize: '0.68rem', fontWeight: 800, padding: '1px 8px', borderRadius: 20,
                      }}>
                        ⭐ High Conversion
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button type="button" onClick={() => startEdit(t)} style={{
                      background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
                      padding: '3px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#374151',
                    }}>Edit</button>
                    <button
                      type="button"
                      disabled={deletingId === t.id}
                      onClick={() => del(t.id)}
                      style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 600, color: '#dc2626',
                      }}
                    >
                      {deletingId === t.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>

                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{t.name}</p>
                <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#6b7280' }}>
                  Subject: <em>{t.subject}</em>
                </p>
                <p style={{
                  margin: 0, fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {t.body}
                </p>
                {t.image_url && (
                  <div style={{ marginTop: 10 }}>
                    <img src={t.image_url} alt={t.image_name ?? 'image'} style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>🖼 Image attached</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
