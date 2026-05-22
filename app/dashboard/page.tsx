'use client';

import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { PostCard } from '../../components/PostCard';
import { StatCard } from '../../components/StatCard';
import { getPostHistory } from '../../lib/social-api';
import type { DashboardPost } from '../../types/post';

export default function DashboardPage() {
  const [posts, setPosts] = useState<DashboardPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPosts() {
      try {
        const data = await getPostHistory();
        if (mounted) {
          setPosts(data);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load posts.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadPosts();
    const interval = window.setInterval(loadPosts, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    const published = posts.filter((post) => post.status === 'published').length;
    const scheduled = posts.filter((post) => post.status === 'scheduled').length;
    const likes = posts.reduce((total, post) => total + (post.likes || 0), 0);
    const comments = posts.reduce((total, post) => total + (post.comments || 0), 0);

    return { published, scheduled, likes, comments };
  }, [posts]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard-main">
        <div className="container">
          <section className="page-header">
            <div>
              <p className="eyebrow">Unified publishing control</p>
              <h1>Nexus Unified Dashboard</h1>
              <p className="lede">
                Plan, publish, and monitor Instagram and LinkedIn content from a single focused workspace.
              </p>
            </div>
          </section>

          <section className="stats-grid" aria-label="Dashboard statistics">
            <StatCard detail="Sent to live channels" label="Published" value={stats.published} />
            <StatCard detail="Queued for later" label="Scheduled" value={stats.scheduled} />
            <StatCard detail="Instagram synced" label="Likes" value={stats.likes.toLocaleString()} />
            <StatCard detail="Instagram synced" label="Comments" value={stats.comments.toLocaleString()} />
          </section>

          <section className="content-grid">
            <div className="post-list">
              {isLoading ? <div className="empty-state">Loading post history...</div> : null}
              {error ? <div className="status-message status-error">{error}</div> : null}
              {!isLoading && !error && posts.length === 0 ? (
                <div className="empty-state">No posts yet. Create your first Instagram or LinkedIn draft.</div>
              ) : null}
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            <aside className="side-panel" aria-label="Operational notes">
              <StatCard detail="Updates every 30 seconds in this browser" label="Live Refresh" value="On" />
              <StatCard detail="Use the submit page for drafts, scheduling, and direct posting" label="Workflow" value="2 channels" />
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
