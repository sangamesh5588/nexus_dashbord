import { AuthGate } from '../../components/AuthGate';
import { Navbar } from '../../components/Navbar';
import { SubmitPostForm } from '../../components/SubmitPostForm';

export default function SubmitPage() {
  return (
    <AuthGate>
      <div className="app-shell">
        <Navbar />
        <main className="form-main">
          <div className="container">
            <section className="page-header">
              <div>
                <p className="eyebrow">Content submission</p>
                <h1>Draft a post</h1>
                <p className="lede">
                  Prepare captions, media URLs, platform targeting, and scheduling from one clean submission flow.
                </p>
              </div>
            </section>

            <SubmitPostForm />
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
