'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../lib/auth-context';
import type { PinLocation } from './MapPinPicker';

const MapPinPicker = dynamic(
  () => import('./MapPinPicker').then((m) => m.MapPinPicker),
  { ssr: false, loading: () => <div style={{ height: 360, borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>Loading map…</div> },
);

type WebsiteFilter = 'all' | 'no_website' | 'has_website';
type FoundLead = { business: string; email: string | null; saved: boolean; duplicate: boolean; hasWebsite: boolean; phone: string | null; contactType: 'email' | 'phone' };
type DoneResult = { saved: number; skipped: number; duplicates: number; errors: string[] };

// ─── Data ────────────────────────────────────────────────────────────────────

const NICHE_SUGGESTIONS = [
  'Real Estate Agency', 'Dental Clinic', 'Accounting Firm',
  'Marketing Agency', 'Restaurant', 'Hotel', 'Gym & Fitness', 'Beauty Salon',
  'IT Company', 'Interior Design', 'Architecture Firm', 'Medical Clinic',
  'Physiotherapy Clinic', 'Pharmacy', 'Car Dealership', 'Travel Agency',
];

const ALL_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
  'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti',
  'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia',
  'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
  'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua',
  'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
  'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan',
  'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania',
  'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia',
  'Turkey', 'Turkmenistan', 'Tuvalu', 'UAE', 'Uganda', 'Ukraine', 'United Kingdom',
  'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

const AREA_SUGGESTIONS_BY_CITY: Record<string, string[]> = {
  dubai: ['Downtown Dubai', 'Business Bay', 'JLT', 'Jumeirah Lake Towers', 'Marina', 'JBR', 'DIFC', 'Al Quoz', 'Deira', 'Bur Dubai', 'Jumeirah', 'Mirdif', 'Al Barsha', 'Silicon Oasis', 'Sports City', 'Healthcare City', 'Media City', 'Internet City'],
  'abu dhabi': ['Corniche', 'Khalidiyah', 'Al Reem Island', 'Yas Island', 'Saadiyat Island', 'Mussafah', 'Al Zahiyah'],
  mumbai: ['Bandra', 'Andheri', 'BKC', 'Powai', 'Nariman Point', 'Worli', 'Juhu', 'Lower Parel', 'Malad'],
  bangalore: ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout', 'MG Road', 'Electronic City', 'Hebbal', 'Jayanagar'],
  london: ['City of London', 'Canary Wharf', 'Mayfair', 'Chelsea', 'Shoreditch', 'Soho', 'Kensington', 'Hackney'],
  'new york': ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Midtown', 'Wall Street', 'SoHo'],
  singapore: ['CBD', 'Orchard', 'Marina Bay', 'Jurong', 'Tampines', 'Changi', 'Bugis'],
  riyadh: ['Olaya', 'Al Malaz', 'King Fahd District', 'Diplomatic Quarter', 'Al Aqiq'],
};

// ─── Searchable Country Dropdown ─────────────────────────────────────────────

function CountrySelect({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync query when value changes from outside
  useEffect(() => { setQuery(value); }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        // If typed something not in the list, revert to last confirmed value or clear
        if (!ALL_COUNTRIES.includes(query)) {
          setQuery(value);
        }
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [query, value]);

  const filtered = query.trim() === ''
    ? ALL_COUNTRIES
    : ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()));

  function select(country: string) {
    onChange(country);
    setQuery(country);
    setOpen(false);
    setHighlighted(0);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(value);
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const isValid = ALL_COUNTRIES.includes(query);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Search country…"
          value={query}
          required={required}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
            setOpen(true);
            if (!e.target.value) onChange('');
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          style={{
            width: '100%',
            paddingRight: 36,
            border: open ? '1.5px solid #ec4899' : '1.5px solid #e2e8f0',
            boxShadow: open ? '0 0 0 3px rgba(236,72,153,0.15)' : 'none',
            outline: 'none',
            background: '#ffffff',
            color: '#1e293b',
            borderRadius: 8,
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
        {/* Chevron icon */}
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})`,
          fontSize: 12, color: 'var(--nexus-muted)', pointerEvents: 'none', transition: 'transform 0.15s',
          userSelect: 'none',
        }}>
          ▼
        </span>
      </div>

      {/* Selected country badge */}
      {isValid && !open && (
        <span style={{
          position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.72rem', background: 'rgba(34,197,94,0.12)', color: '#16a34a',
          padding: '1px 7px', borderRadius: 10, fontWeight: 700, pointerEvents: 'none',
        }}>
          ✓
        </span>
      )}

      {/* Dropdown */}
      {open && (
        <ul
          ref={listRef}
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 10, maxHeight: 240, overflowY: 'auto',
            margin: 0, padding: '4px 0', listStyle: 'none',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {filtered.length === 0 && (
            <li style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.88rem' }}>
              No country found
            </li>
          )}
          {filtered.map((c, i) => (
            <li
              key={c}
              onMouseDown={() => select(c)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: '9px 16px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                background: i === highlighted ? '#ec4899' : c === value ? '#fdf2f8' : '#ffffff',
                color: i === highlighted ? '#ffffff' : c === value ? '#be185d' : '#1e293b',
                fontWeight: c === value ? 700 : 400,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'background 0.08s',
                borderLeft: c === value && i !== highlighted ? '3px solid #ec4899' : '3px solid transparent',
              }}
            >
              {c}
              {c === value && i !== highlighted && (
                <span style={{ fontSize: 11, color: '#ec4899', fontWeight: 800 }}>✓</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Highlight count when searching */}
      {open && query && filtered.length > 0 && filtered.length < ALL_COUNTRIES.length && (
        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--nexus-muted)' }}>
          {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
        </p>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

type SearchMode = 'text' | 'map';

export function LeadGeneratorForm() {
  const { authFetch } = useAuth();
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [area, setArea] = useState('');
  const [pinLocation, setPinLocation] = useState<PinLocation | null>(null);
  const [maxLeads, setMaxLeads] = useState(20);
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>('no_website');
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [found, setFound] = useState<FoundLead[]>([]);
  const [done, setDone] = useState<DoneResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const areaSuggestions = AREA_SUGGESTIONS_BY_CITY[city.toLowerCase()] ?? [];

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (searchMode === 'text' && !ALL_COUNTRIES.includes(country)) {
      alert('Please select a valid country from the dropdown.');
      return;
    }
    if (searchMode === 'map' && !pinLocation) {
      alert('Please drop a pin on the map to set your search location.');
      return;
    }
    setIsRunning(true);
    setFound([]);
    setDone(null);
    setError(null);
    setStatusMsg('Starting…');

    try {
      const res = await authFetch('/api/email/generate-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          city: searchMode === 'map' ? (pinLocation?.locationName ?? '') : city,
          country: searchMode === 'map' ? '' : country,
          area: searchMode === 'text' ? (area.trim() || undefined) : undefined,
          maxLeads,
          websiteFilter,
          locationPin: searchMode === 'map' ? pinLocation : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Request failed.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            type SSEEvent =
              | { type: 'status'; message: string }
              | { type: 'found'; business: string; email: string | null; saved: boolean; duplicate: boolean; hasWebsite: boolean; phone: string | null; contactType: 'email' | 'phone' }
              | { type: 'done'; saved: number; skipped: number; duplicates: number; errors: string[] }
              | { type: 'error'; message: string };
            const event = JSON.parse(line.slice(6)) as SSEEvent;
            if (event.type === 'status') setStatusMsg(event.message);
            if (event.type === 'found') setFound((prev) => [...prev, { business: event.business, email: event.email, saved: event.saved, duplicate: event.duplicate, hasWebsite: event.hasWebsite ?? true, phone: event.phone ?? null, contactType: event.contactType ?? 'email' }]);
            if (event.type === 'done') { setDone(event); setStatusMsg(''); }
            if (event.type === 'error') { setError(event.message); setStatusMsg(''); }
          } catch { /* malformed */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed.');
      setStatusMsg('');
    } finally {
      setIsRunning(false);
    }
  }

  const savedCount = found.filter(f => f.saved).length;
  const dupCount = found.filter(f => f.duplicate).length;

  return (
    <div className="form-grid">
      <form className="form-panel form-grid" onSubmit={handleGenerate}>
        <p className="fieldset-label" style={{ margin: 0 }}>Target your search</p>

        {/* ── Search mode switcher ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 0, border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
          {([
            { key: 'text', label: '🔤 Text Search' },
            { key: 'map',  label: '🗺 Map Pin' },
          ] as { key: SearchMode; label: string }[]).map((m) => {
            const active = searchMode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setSearchMode(m.key)}
                style={{
                  padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: active ? '#ec4899' : '#ffffff',
                  color: active ? '#ffffff' : '#6b7280',
                  transition: 'all 0.15s',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Niche — always shown */}
        <div className="field">
          <label>Business Niche / Industry</label>
          <input
            type="text"
            list="niche-suggestions"
            placeholder="e.g. Dental Clinic, Real Estate Agency, Accounting Firm…"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            required
          />
          <datalist id="niche-suggestions">
            {NICHE_SUGGESTIONS.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>

        {/* ── Text mode fields ─────────────────────────────────────── */}
        {searchMode === 'text' && (
          <>
            {/* Country + City */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Country</label>
                <CountrySelect value={country} onChange={setCountry} required />
              </div>
              <div className="field">
                <label>City</label>
                <input
                  type="text"
                  placeholder="e.g. Dubai, Mumbai, London…"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Area */}
            <div className="field">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Area / District</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--nexus-muted)', fontWeight: 400 }}>
                  Optional — narrows to a zone
                </span>
              </label>
              <input
                type="text"
                list="area-suggestions"
                placeholder={
                  areaSuggestions.length > 0
                    ? `e.g. ${areaSuggestions.slice(0, 3).join(', ')}…`
                    : 'e.g. Downtown, Business Bay, JLT…'
                }
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
              {areaSuggestions.length > 0 && (
                <datalist id="area-suggestions">
                  {areaSuggestions.map((a) => <option key={a} value={a} />)}
                </datalist>
              )}
              {area.trim() && (
                <span style={{ fontSize: '0.8rem', color: 'var(--nexus-secondary)', marginTop: 4, display: 'block' }}>
                  ↳ Will search: &ldquo;{niche || 'businesses'} in {area.trim()}, {city || 'city'}, {country}&rdquo;
                </span>
              )}
            </div>
          </>
        )}

        {/* ── Map pin mode ─────────────────────────────────────────── */}
        {searchMode === 'map' && (
          <div className="field">
            <label>Drop a pin on the target area</label>
            <MapPinPicker value={pinLocation} onChange={setPinLocation} />
          </div>
        )}

        {/* Website filter */}
        <div className="field">
          <label>Target businesses</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { key: 'no_website', label: '🎯 No Website Only', desc: 'Best for web/digital pitch', color: '#7c3aed' },
              { key: 'all',        label: '🌐 All Businesses',  desc: 'Website + no website',     color: '#6b7280' },
              { key: 'has_website',label: '✅ Has Website',     desc: 'Website businesses only',  color: '#0ea5e9' },
            ] as { key: WebsiteFilter; label: string; desc: string; color: string }[]).map((opt) => {
              const active = websiteFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setWebsiteFilter(opt.key)}
                  style={{
                    flex: 1, minWidth: 140,
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    border: active ? `2px solid ${opt.color}` : '2px solid #e5e7eb',
                    background: active ? `${opt.color}12` : '#ffffff',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: active ? opt.color : '#374151' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.75rem', color: active ? opt.color : '#9ca3af', marginTop: 2 }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>
          {websiteFilter === 'no_website' && (
            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>
              Businesses without a website are saved with their phone number — prime leads for web services.
            </p>
          )}
        </div>

        {/* Lead count */}
        <div className="field">
          <label>Number of leads to find</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[20, 50, 100, 250, 500].map((n) => (
              <button key={n} type="button"
                className={`button ${maxLeads === n ? '' : 'button-secondary'}`}
                style={{ minWidth: 56 }}
                onClick={() => setMaxLeads(n)}
              >{n}</button>
            ))}
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--nexus-muted)' }}>
            Up to 500 leads per search. Higher counts take longer — use area filters to get targeted results.
          </span>
        </div>

        <button
          className="button"
          type="submit"
          disabled={isRunning || (searchMode === 'text' ? !ALL_COUNTRIES.includes(country) : !pinLocation)}
        >
          {isRunning
            ? `⟳ Processing… (${savedCount} saved${dupCount > 0 ? `, ${dupCount} skipped` : ''})`
            : `🔍 Find up to ${maxLeads} Leads`}
        </button>
      </form>

      {/* Live progress */}
      {(isRunning || found.length > 0 || done || error) && (
        <div className="form-panel" style={{ padding: 20 }}>
          {statusMsg && (
            <p style={{ color: 'var(--nexus-secondary)', fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>
              ⟳ {statusMsg}
            </p>
          )}
          {error && (
            <div className="status-message status-error" style={{ marginBottom: 12 }}>⚠ {error}</div>
          )}
          {done && (
            <div style={{ marginBottom: 16, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1rem', color: 'var(--nexus-primary)' }}>
                ✅ {done.saved} new lead{done.saved !== 1 ? 's' : ''} saved to your database
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.83rem', color: 'var(--nexus-muted)' }}>
                {done.duplicates > 0 && <span>↩ {done.duplicates} already in DB (skipped)</span>}
                {done.skipped > 0 && <span>— {done.skipped} skipped</span>}
                {done.errors.length > 0 && (
                  <details>
                    <summary style={{ cursor: 'pointer' }}>⚠ {done.errors.length} error{done.errors.length !== 1 ? 's' : ''}</summary>
                    <ul style={{ marginTop: 6, paddingLeft: 16 }}>
                      {done.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
          {found.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontWeight: 800, margin: 0, fontSize: '0.9rem' }}>{found.length} businesses processed</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {savedCount > 0 && (
                    <span style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', fontWeight: 700, fontSize: '0.78rem', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(34,197,94,0.3)' }}>
                      💾 {savedCount} new
                    </span>
                  )}
                  {dupCount > 0 && (
                    <span style={{ background: 'rgba(100,116,139,0.1)', color: 'var(--nexus-muted)', fontWeight: 700, fontSize: '0.78rem', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(100,116,139,0.2)' }}>
                      ↩ {dupCount} exists
                    </span>
                  )}
                </div>
              </div>
              <div className="activity-feed" style={{ maxHeight: 380 }}>
                {found.map((item, i) => (
                  <div key={i} className="activity-row" style={{ alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', color: 'var(--nexus-primary)' }}>
                        {item.business}
                      </span>
                      {!item.hasWebsite && (
                        <span style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 700 }}>No website</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      {/* No contact info at all */}
                      {!item.email && !item.phone && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--nexus-muted)', padding: '2px 8px', borderRadius: 12, background: 'rgba(100,116,139,0.08)' }}>No contact</span>
                      )}
                      {/* Already in DB */}
                      {item.duplicate && (
                        <>
                          {item.contactType === 'phone' && item.phone && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--nexus-muted)' }}>📞 {item.phone}</span>
                          )}
                          {item.contactType === 'email' && item.email && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--nexus-muted)' }}>{item.email.toLowerCase()}</span>
                          )}
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--nexus-muted)', padding: '2px 8px', borderRadius: 12, background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>↩ Already in DB</span>
                        </>
                      )}
                      {/* Saved */}
                      {!item.duplicate && item.saved && (
                        <>
                          {item.contactType === 'phone' && item.phone && (
                            <span style={{ fontSize: '0.75rem', color: '#7c3aed' }}>📞 {item.phone}</span>
                          )}
                          {item.contactType === 'email' && item.email && (
                            <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>{item.email.toLowerCase()}</span>
                          )}
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.contactType === 'phone' ? '#7c3aed' : '#16a34a', padding: '2px 8px', borderRadius: 12, background: item.contactType === 'phone' ? 'rgba(124,58,237,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${item.contactType === 'phone' ? 'rgba(124,58,237,0.25)' : 'rgba(34,197,94,0.25)'}` }}>
                            {item.contactType === 'phone' ? '📞 Saved' : '💾 Saved'}
                          </span>
                        </>
                      )}
                      {/* Failed to save */}
                      {!item.duplicate && !item.saved && (item.email ?? item.phone) && (
                        <>
                          {item.contactType === 'phone' && item.phone && (
                            <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>📞 {item.phone}</span>
                          )}
                          {item.contactType === 'email' && item.email && (
                            <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{item.email.toLowerCase()}</span>
                          )}
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', padding: '2px 8px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>⚠ Failed</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {done && (
                <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                  <a className="button" href="/email/leads" style={{ textDecoration: 'none' }}>View All Leads →</a>
                  <a className="button button-secondary" href="/email" style={{ textDecoration: 'none' }}>Run Campaign</a>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
