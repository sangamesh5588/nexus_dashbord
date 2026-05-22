import { Navbar } from '../../../components/Navbar';
import { LeadGeneratorForm } from '../../../components/email/LeadGeneratorForm';

export default function GenerateLeadsPage() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard-main">
        <div className="container">
          <section className="page-header">
            <div>
              <p className="eyebrow">AI-powered prospecting</p>
              <h1>Generate Leads</h1>
              <p className="lede">
                Pick a country, city, and niche — the system searches Google for real businesses,
                extracts their emails, and uses Claude AI to write a personalised pitch note for each one.
                Leads are saved directly to your database and ready to campaign.
              </p>
            </div>
            <a className="button button-secondary" href="/email" style={{ flexShrink: 0, textDecoration: 'none' }}>
              ← Back to Dashboard
            </a>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 24, alignItems: 'start' }}>
            <LeadGeneratorForm />

            <aside className="side-panel">
              <div className="form-panel" style={{ padding: 20 }}>
                <p className="fieldset-label" style={{ margin: '0 0 12px' }}>How it works</p>
                <ol style={{ paddingLeft: 18, fontSize: '0.88rem', lineHeight: 2, color: 'var(--nexus-muted)' }}>
                  <li>Searches Google Places for businesses</li>
                  <li>Gets their website from Google</li>
                  <li>Scrapes website for email address</li>
                  <li>Falls back to <code>info@domain</code> pattern</li>
                  <li>Claude writes a personalised pitch note</li>
                  <li>Saves all leads to your database</li>
                </ol>
              </div>

              <div className="form-panel" style={{ padding: 20 }}>
                <p className="fieldset-label" style={{ margin: '0 0 12px' }}>Daily sending limit</p>
                <p style={{ fontSize: '0.88rem', color: 'var(--nexus-muted)', lineHeight: 1.6 }}>
                  Gmail allows <strong style={{ color: 'var(--nexus-primary)' }}>~500 emails/day</strong>.
                  The sequencer respects your campaign delay settings.
                  Recommended: <strong style={{ color: 'var(--nexus-primary)' }}>50–100/day</strong> for best deliverability.
                </p>
              </div>

              <div className="form-panel" style={{ padding: 20 }}>
                <p className="fieldset-label" style={{ margin: '0 0 12px' }}>Tip — personalise better</p>
                <p style={{ fontSize: '0.88rem', color: 'var(--nexus-muted)', lineHeight: 1.6 }}>
                  Go to <a href="/email/settings" style={{ color: 'var(--nexus-secondary)' }}>Email Settings</a> and fill in your
                  AI Persona Bio. Claude uses it to match your voice when writing the pitch notes.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
