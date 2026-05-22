'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import type { AIProvider } from '../../types/email';

type SettingsData = {
  sender_display_name: string;
  profile_role: string;
  profile_company: string;
  ai_persona_bio: string;
  gmail_address: string;
  gmail_app_password: string;
  ai_provider: AIProvider;
  ai_api_key: string;
  gmail_oauth_refresh_token: string | null;
  is_gmail_connected: boolean;
};

type Props = { oauthStatus?: string | null };

const PROVIDERS: { id: AIProvider; label: string; placeholder: string; docsUrl: string }[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    placeholder: 'sk-ant-api03-…',
    docsUrl: 'https://console.anthropic.com/account/keys',
  },
  {
    id: 'openai',
    label: 'OpenAI (GPT-4o)',
    placeholder: 'sk-proj-…',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    label: 'Google (Gemini)',
    placeholder: 'AIzaSy…',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
];

export function SettingsForm({ oauthStatus }: Props) {
  const { authFetch } = useAuth();

  const [form, setForm] = useState<SettingsData>({
    sender_display_name: '',
    profile_role: '',
    profile_company: '',
    ai_persona_bio: '',
    gmail_address: '',
    gmail_app_password: '',
    ai_provider: 'anthropic',
    ai_api_key: '',
    gmail_oauth_refresh_token: null,
    is_gmail_connected: false, // kept in type for future use
  });

  const [passwordChanged, setPasswordChanged] = useState(false);
  const [apiKeyChanged, setApiKeyChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    authFetch('/api/email/settings')
      .then((r) => r.json())
      .then((data: { settings?: Partial<SettingsData> }) => {
        if (data.settings) {
          setForm((f) => ({
            ...f,
            sender_display_name: data.settings?.sender_display_name ?? '',
            profile_role: data.settings?.profile_role ?? '',
            profile_company: data.settings?.profile_company ?? '',
            ai_persona_bio: data.settings?.ai_persona_bio ?? '',
            gmail_address: data.settings?.gmail_address ?? '',
            gmail_app_password: data.settings?.gmail_app_password ?? '',
            ai_provider: (data.settings?.ai_provider as AIProvider) ?? 'anthropic',
            ai_api_key: data.settings?.ai_api_key ?? '',
            is_gmail_connected: data.settings?.is_gmail_connected ?? false,
          }));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field: keyof SettingsData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleGenerateBio() {
    if (!form.sender_display_name.trim()) {
      setError('Enter your display name first so AI can write a personalised bio.');
      return;
    }
    setIsGeneratingBio(true);
    setError(null);
    try {
      const res = await authFetch('/api/email/generate-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.sender_display_name,
          role: form.profile_role,
          company: form.profile_company,
        }),
      });
      const data = await res.json() as { bio?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Generation failed.');
      if (data.bio) setForm((f) => ({ ...f, ai_persona_bio: data.bio! }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bio generation failed.');
    } finally {
      setIsGeneratingBio(false);
    }
  }

  async function handleTestAI() {
    if (!apiKeyChanged && form.ai_api_key.includes('•')) {
      setTestResult({ ok: false, msg: 'Enter a new API key to test it.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await authFetch('/api/email/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: form.ai_provider, apiKey: form.ai_api_key }),
      });
      const data = await res.json() as { ok?: boolean; model?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Test failed.');
      setTestResult({ ok: true, msg: `✓ Connected — using ${data.model}` });
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Test failed.' });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload: Record<string, string> = {
        sender_display_name: form.sender_display_name,
        profile_role: form.profile_role,
        profile_company: form.profile_company,
        ai_persona_bio: form.ai_persona_bio,
        gmail_address: form.gmail_address,
        ai_provider: form.ai_provider,
      };
      if (passwordChanged && form.gmail_app_password && !form.gmail_app_password.includes('•')) {
        payload.gmail_app_password = form.gmail_app_password;
      }
      if (apiKeyChanged && form.ai_api_key && !form.ai_api_key.includes('•')) {
        payload.ai_api_key = form.ai_api_key;
      }
      const res = await authFetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Save failed.');
      setMessage('Settings saved.');
      setPasswordChanged(false);
      setApiKeyChanged(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!loaded) {
    return <div className="form-panel" style={{ padding: 24, color: 'var(--nexus-muted)' }}>Loading…</div>;
  }

  const selectedProvider = PROVIDERS.find((p) => p.id === form.ai_provider) ?? PROVIDERS[0];
  const initials = form.sender_display_name ? form.sender_display_name[0].toUpperCase() : '?';

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* OAuth status banners (kept for future use) */}
      {oauthStatus === 'denied' && <div className="status-message status-error">Gmail access was denied. Please try again.</div>}

      {/* ── Identity ─────────────────────────────────────────────────── */}
      <div className="form-panel" style={{ padding: 24 }}>
        <p className="fieldset-label" style={{ margin: '0 0 20px' }}>👤 Your Identity</p>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Avatar preview */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: 'var(--nexus-secondary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', fontWeight: 800,
          }}>
            {initials}
          </div>

          {/* Name / Role / Company */}
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Display Name <span style={{ color: 'var(--nexus-muted)', fontWeight: 400 }}>(shown to leads)</span></label>
              <input type="text" placeholder="e.g. Sangamesh | Nexus Software Studio" value={form.sender_display_name} onChange={set('sender_display_name')} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Your Role</label>
                <input type="text" placeholder="e.g. Founder & CEO" value={form.profile_role} onChange={set('profile_role')} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Company</label>
                <input type="text" placeholder="e.g. Nexus Software Studio" value={form.profile_company} onChange={set('profile_company')} />
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              AI Response Style / Bio
            </label>
            <button
              type="button"
              className="button button-secondary"
              style={{ fontSize: '0.8rem', padding: '5px 12px' }}
              disabled={isGeneratingBio}
              onClick={handleGenerateBio}
            >
              {isGeneratingBio ? '✨ Generating…' : '✨ Generate with AI'}
            </button>
          </div>
          <textarea
            placeholder="Fill in your name, role and company above then click Generate — or write your own here."
            value={form.ai_persona_bio}
            onChange={set('ai_persona_bio')}
            style={{ minHeight: 100, width: '100%' }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--nexus-muted)' }}>
            AI uses this to reply to leads in your voice.
          </span>
        </div>
      </div>

      {/* ── Bottom two-column grid ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── Gmail sending ────────────────────────────────────────────── */}
        <div className="form-panel" style={{ padding: 24 }}>
          <p className="fieldset-label" style={{ margin: '0 0 16px' }}>📤 Gmail (Sending)</p>

          <div className="form-grid">
            <div className="field">
              <label>Gmail Address</label>
              <input type="email" placeholder="you@gmail.com" value={form.gmail_address} onChange={set('gmail_address')} required />
            </div>

            <div className="field">
              <label>App Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={passwordChanged ? 'text' : 'password'}
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={form.gmail_app_password}
                  onChange={(e) => { setPasswordChanged(true); setForm((f) => ({ ...f, gmail_app_password: e.target.value })); }}
                  autoComplete="new-password"
                  style={{ paddingRight: 80 }}
                />
                {!passwordChanged && form.gmail_app_password && (
                  <span style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: '0.72rem', background: 'rgba(34,197,94,0.12)', color: '#16a34a',
                    padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                  }}>✓ Saved</span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--nexus-muted)' }}>
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--nexus-secondary)' }}>
                  Create an App Password here
                </a>{' '}(requires 2-Step Verification)
              </span>
            </div>

          </div>
        </div>

        {/* ── AI Provider ────────────────────────────────────────────────── */}
        <div className="form-panel" style={{ padding: 24 }}>
          <p className="fieldset-label" style={{ margin: '0 0 16px' }}>🤖 AI Provider</p>
          <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--nexus-muted)', lineHeight: 1.5 }}>
            Bring your own API key. AI writes personalised pitch notes, bios, and lead summaries.
          </p>

          <div className="form-grid">
            {/* Provider selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PROVIDERS.map((p) => (
                <label
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    padding: '10px 14px', borderRadius: 8,
                    border: `2px solid ${form.ai_provider === p.id ? 'var(--nexus-secondary)' : 'var(--nexus-border)'}`,
                    background: form.ai_provider === p.id ? 'rgba(236,72,153,0.05)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="ai_provider"
                    value={p.id}
                    checked={form.ai_provider === p.id}
                    onChange={() => setForm((f) => ({ ...f, ai_provider: p.id }))}
                    style={{ accentColor: 'var(--nexus-secondary)' }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.label}</span>
                </label>
              ))}
            </div>

            {/* API Key */}
            <div className="field" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>API Key</label>
                <a href={selectedProvider.docsUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.78rem', color: 'var(--nexus-secondary)' }}>
                  Get key →
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={apiKeyChanged ? 'text' : 'password'}
                  placeholder={selectedProvider.placeholder}
                  value={form.ai_api_key}
                  onChange={(e) => { setApiKeyChanged(true); setForm((f) => ({ ...f, ai_api_key: e.target.value })); }}
                  autoComplete="new-password"
                  style={{ paddingRight: 80 }}
                />
                {!apiKeyChanged && form.ai_api_key && (
                  <span style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: '0.72rem', background: 'rgba(34,197,94,0.12)', color: '#16a34a',
                    padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                  }}>✓ Saved</span>
                )}
              </div>
            </div>

            {/* Test button + result */}
            <div>
              <button
                type="button"
                className="button button-secondary"
                style={{ width: '100%', fontSize: '0.85rem' }}
                disabled={isTesting}
                onClick={handleTestAI}
              >
                {isTesting ? 'Testing…' : '⚡ Test Connection'}
              </button>
              {testResult && (
                <div className={`status-message${testResult.ok ? '' : ' status-error'}`} style={{ marginTop: 8 }}>
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      {message && <div className="status-message">✅ {message}</div>}
      {error && <div className="status-message status-error">⚠ {error}</div>}

      <button className="button" type="submit" disabled={isSaving} style={{ alignSelf: 'flex-start', minWidth: 160 }}>
        {isSaving ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  );
}
