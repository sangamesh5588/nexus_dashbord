'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import type { EmailCampaign } from '../../types/email';

type StepForm = {
  name: string;
  subject: string;
  body: string;
  delay_days: number;
  is_active: boolean;
};

const defaultStep = (): StepForm => ({ name: '', subject: '', body: '', delay_days: 0, is_active: true });

export function CampaignEditor() {
  const { authFetch } = useAuth();
  const [steps, setSteps] = useState<[StepForm, StepForm, StepForm]>([defaultStep(), defaultStep(), defaultStep()]);
  const [saving, setSaving] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [messages, setMessages] = useState<[string | null, string | null, string | null]>([null, null, null]);
  const [errors, setErrors] = useState<[string | null, string | null, string | null]>([null, null, null]);

  useEffect(() => {
    authFetch('/api/email/campaigns')
      .then((r) => r.json())
      .then((data: { campaigns?: EmailCampaign[] }) => {
        if (!data.campaigns) return;
        const updated: [StepForm, StepForm, StepForm] = [defaultStep(), defaultStep(), defaultStep()];
        for (const c of data.campaigns) {
          updated[c.step - 1] = {
            name: c.name,
            subject: c.subject,
            body: c.body,
            delay_days: c.delay_days,
            is_active: c.is_active,
          };
        }
        setSteps(updated);
      })
      .catch(() => null);
  }, []);

  function updateStep(index: 0 | 1 | 2, field: keyof StepForm, value: string | number | boolean) {
    setSteps((prev) => {
      const next = [...prev] as [StepForm, StepForm, StepForm];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function saveStep(index: 0 | 1 | 2) {
    const step = index + 1;
    const form = steps[index];

    setSaving((prev) => { const n = [...prev] as [boolean, boolean, boolean]; n[index] = true; return n; });
    setMessages((prev) => { const n = [...prev] as [string | null, string | null, string | null]; n[index] = null; return n; });
    setErrors((prev) => { const n = [...prev] as [string | null, string | null, string | null]; n[index] = null; return n; });

    try {
      const res = await authFetch('/api/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, ...form }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Save failed.');
      setMessages((prev) => { const n = [...prev] as [string | null, string | null, string | null]; n[index] = `Step ${step} saved.`; return n; });
    } catch (err) {
      setErrors((prev) => { const n = [...prev] as [string | null, string | null, string | null]; n[index] = err instanceof Error ? err.message : 'Save failed.'; return n; });
    } finally {
      setSaving((prev) => { const n = [...prev] as [boolean, boolean, boolean]; n[index] = false; return n; });
    }
  }

  const delayLabel = (index: 0 | 1 | 2) =>
    index === 0 ? 'Days after lead upload (0 = send immediately)' : `Days after Step ${index} email`;

  return (
    <div className="campaign-editor">
      {([0, 1, 2] as const).map((i) => (
        <div key={i} className="form-panel campaign-step">
          <div className="step-header">
            <span className="step-badge">Step {i + 1}</span>
            <label className="check-card" style={{ border: 'none', padding: 0 }}>
              <input
                type="checkbox"
                checked={steps[i].is_active}
                onChange={(e) => updateStep(i, 'is_active', e.target.checked)}
              />
              Active
            </label>
          </div>

          <div className="form-grid" style={{ marginTop: 16 }}>
            <div className="field">
              <label>Campaign Name</label>
              <input
                type="text"
                placeholder={`Follow-up ${i + 1}`}
                value={steps[i].name}
                onChange={(e) => updateStep(i, 'name', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Subject Line</label>
              <input
                type="text"
                placeholder="Use {{name}}, {{company}} for personalisation"
                value={steps[i].subject}
                onChange={(e) => updateStep(i, 'subject', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Email Body</label>
              <textarea
                placeholder={`Hi {{name}},\n\nYour message here...\n\nPlaceholders: {{name}}, {{company}}, {{custom_note}}`}
                value={steps[i].body}
                onChange={(e) => updateStep(i, 'body', e.target.value)}
              />
            </div>
            <div className="field">
              <label>{delayLabel(i)}</label>
              <input
                type="number"
                min={0}
                value={steps[i].delay_days}
                onChange={(e) => updateStep(i, 'delay_days', Number(e.target.value))}
              />
            </div>

            {messages[i] ? <div className="status-message">✓ {messages[i]}</div> : null}
            {errors[i] ? <div className="status-message status-error">{errors[i]}</div> : null}

            <button className="button" type="button" disabled={saving[i]} onClick={() => saveStep(i)}>
              {saving[i] ? 'Saving…' : `Save Step ${i + 1}`}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
