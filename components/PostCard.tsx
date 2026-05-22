import type { DashboardPost } from '../types/post';

function formatDate(value: string | null) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function PostCard({ post }: { post: DashboardPost }) {
  const hasInstagram = post.platforms.includes('instagram');

  return (
    <article className="post-card">
      <div className="post-card-body">
        <div className="post-card-topline">
          <div className="platform-badges">
            {post.platforms.map((platform) => (
              <span className={platform === 'instagram' ? 'badge badge-accent' : 'badge'} key={platform}>
                {platform}
              </span>
            ))}
          </div>
          <span className="badge badge-muted">{post.status}</span>
        </div>

        <p className="caption">{post.caption}</p>

        <div className="post-meta">
          <span>Created {formatDate(post.created_at)}</span>
          <span>Scheduled {formatDate(post.scheduled_at)}</span>
        </div>

        <div className="metric-row" aria-label="Engagement metrics">
          <span>{post.likes.toLocaleString()} likes</span>
          <span>{post.comments.toLocaleString()} comments</span>
          <span>{post.last_synced_at ? `Synced ${formatDate(post.last_synced_at)}` : hasInstagram ? 'Sync pending' : 'LinkedIn metrics pending'}</span>
        </div>
      </div>
    </article>
  );
}
