'use client';

import { useRef, useState } from 'react';
import { useAuth } from '../../lib/auth-context';

type RejectedEmail = { email: string; reason: string };

type UploadResult = {
  saved: number;
  batch: string;
  rejected: number;
  rejectedList: RejectedEmail[];
};

type Props = { onUploaded: (count: number, batch: string) => void };

export function LeadUploader({ onUploaded }: Props) {
  const { authFetch } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  async function handleUpload(file: File) {
    setIsUploading(true);
    setError(null);
    setResult(null);
    setShowRejected(false);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await authFetch('/api/email/leads', { method: 'POST', body: form });
      const data = await res.json() as {
        saved?: number; count?: number; batch?: string; error?: string;
        rejected?: number; rejectedList?: RejectedEmail[];
      };
      if (!res.ok) throw new Error(data.error ?? 'Upload failed.');

      const uploadResult: UploadResult = {
        saved: data.saved ?? data.count ?? 0,
        batch: data.batch ?? '',
        rejected: data.rejected ?? 0,
        rejectedList: data.rejectedList ?? [],
      };
      setResult(uploadResult);
      onUploaded(uploadResult.saved, uploadResult.batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset so the same file can be re-uploaded
    e.target.value = '';
  }

  // Group rejected by reason for a clean summary
  function groupByReason(list: RejectedEmail[]) {
    const map: Record<string, string[]> = {};
    for (const { email, reason } of list) {
      map[reason] = map[reason] ?? [];
      map[reason].push(email);
    }
    return map;
  }

  return (
    <div className="upload-box">
      <div className="upload-hint">
        <span className="upload-icon">📎</span>
        <p>
          Upload an Excel file (.xlsx) with columns: <strong>email</strong>, name, company, custom_note
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--nexus-muted)' }}>
          ⚠ Only <strong>business email addresses</strong> are accepted. Gmail, Yahoo, Hotmail and other
          personal/free domains will be skipped automatically.
        </p>
      </div>

      {/* Success result */}
      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Saved count */}
          <div className="status-message" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✓ {result.saved} business lead{result.saved !== 1 ? 's' : ''} saved (batch {result.batch})</span>
          </div>

          {/* Rejected count */}
          {result.rejected > 0 && (
            <div
              className="status-message"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.35)',
                color: '#b45309',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span>
                ⚠ {result.rejected} email{result.rejected !== 1 ? 's' : ''} skipped — not a business address
              </span>
              {result.rejectedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRejected((v) => !v)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.78rem', color: '#b45309', fontWeight: 700, padding: '2px 6px',
                  }}
                >
                  {showRejected ? 'Hide ▲' : 'Details ▼'}
                </button>
              )}
            </div>
          )}

          {/* Rejected details dropdown */}
          {showRejected && result.rejectedList.length > 0 && (
            <div style={{
              background: 'rgba(245,158,11,0.04)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 8, padding: '12px 14px',
              fontSize: '0.8rem', color: 'var(--nexus-muted)',
            }}>
              {Object.entries(groupByReason(result.rejectedList)).map(([reason, emails]) => (
                <div key={reason} style={{ marginBottom: 8 }}>
                  <strong style={{ color: '#d97706' }}>{reason}</strong>
                  <div style={{ marginTop: 4, lineHeight: 1.6 }}>
                    {emails.map((e) => (
                      <span key={e} style={{
                        display: 'inline-block', background: 'rgba(0,0,0,0.05)',
                        borderRadius: 4, padding: '1px 6px', margin: '2px',
                        fontFamily: 'monospace', fontSize: '0.78rem',
                      }}>
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {result.rejected > result.rejectedList.length && (
                <p style={{ margin: '8px 0 0', fontStyle: 'italic' }}>
                  …and {result.rejected - result.rejectedList.length} more
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}

      {error ? <div className="status-message status-error">{error}</div> : null}

      <button
        className="button"
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? 'Uploading…' : 'Choose Excel File'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
}
