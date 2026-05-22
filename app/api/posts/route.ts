import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postToInstagram, postToLinkedIn, syncInstagramEngagement } from '../../../lib/social-api';
import type { DashboardPost, Platform, PostDraft } from '../../../types/post';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your_') || serviceRoleKey.includes('your_')) {
    throw new Error('Supabase service credentials are not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isPlatform(value: unknown): value is Platform {
  return value === 'instagram' || value === 'linkedin';
}

function parseDraft(input: unknown): PostDraft {
  const payload = input as Partial<PostDraft>;

  if (!payload.caption || typeof payload.caption !== 'string') {
    throw new Error('Caption is required.');
  }

  if (!Array.isArray(payload.platforms) || payload.platforms.length === 0 || !payload.platforms.every(isPlatform)) {
    throw new Error('Choose Instagram, LinkedIn, or both.');
  }

  return {
    caption: payload.caption,
    imageUrl: typeof payload.imageUrl === 'string' && payload.imageUrl.length > 0 ? payload.imageUrl : undefined,
    platforms: payload.platforms,
    scheduledAt: typeof payload.scheduledAt === 'string' && payload.scheduledAt.length > 0 ? payload.scheduledAt : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const draft = parseDraft(await request.json());
    const supabase = getAdminClient();
    const shouldPublishNow = !draft.scheduledAt || new Date(draft.scheduledAt).getTime() <= Date.now();
    const errors: string[] = [];
    let instagramMediaId: string | null = null;
    let linkedInPostId: string | null = null;

    if (shouldPublishNow && draft.platforms.includes('instagram')) {
      try {
        const result = await postToInstagram(draft);
        instagramMediaId = result.id || null;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Instagram publish failed.');
      }
    }

    if (shouldPublishNow && draft.platforms.includes('linkedin')) {
      try {
        const result = await postToLinkedIn(draft);
        linkedInPostId = result.id || null;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'LinkedIn publish failed.');
      }
    }

    const status = draft.scheduledAt ? 'scheduled' : errors.length > 0 ? 'failed' : 'published';

    const { data, error } = await supabase
      .from('posts')
      .insert({
        caption: draft.caption,
        image_url: draft.imageUrl || null,
        platforms: draft.platforms,
        scheduled_at: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : null,
        status,
        instagram_media_id: instagramMediaId,
        linkedin_post_id: linkedInPostId,
        likes: 0,
        comments: 0,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    const post = data as DashboardPost;
    const syncedPost = instagramMediaId ? await syncInstagramEngagement(post) : post;

    return NextResponse.json({ post: syncedPost, warnings: errors }, { status: errors.length > 0 ? 207 : 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create post.' },
      { status: 400 },
    );
  }
}
