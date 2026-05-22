export type Platform = 'instagram' | 'linkedin';

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export type DashboardPost = {
  id: string;
  caption: string;
  image_url: string | null;
  platforms: Platform[];
  scheduled_at: string | null;
  status: PostStatus;
  instagram_media_id: string | null;
  linkedin_post_id: string | null;
  likes: number;
  comments: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type PostDraft = {
  caption: string;
  imageUrl?: string;
  platforms: Platform[];
  scheduledAt?: string;
};
