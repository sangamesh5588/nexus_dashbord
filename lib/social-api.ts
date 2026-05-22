import axios, { AxiosError } from 'axios';
import { supabase } from './supabase';
import type { DashboardPost, PostDraft } from '../types/post';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

type SocialPostResult = {
  id?: string;
  success: boolean;
};

type InstagramInsight = {
  id: string;
  like_count?: number;
  comments_count?: number;
};

function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: { message?: string }; message?: string }>;
    return axiosError.response?.data?.error?.message || axiosError.response?.data?.message || axiosError.message;
  }

  return error instanceof Error ? error.message : fallback;
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value || value.includes('your_')) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export async function postToInstagram(draft: Pick<PostDraft, 'caption' | 'imageUrl'>): Promise<SocialPostResult> {
  const accessToken = requireEnv('INSTAGRAM_ACCESS_TOKEN');
  const instagramUserId = requireEnv('INSTAGRAM_USER_ID');

  if (!draft.imageUrl) {
    throw new Error('Instagram Graph API publishing requires an image URL.');
  }

  try {
    const media = await axios.post<{ id: string }>(`${GRAPH_API_BASE}/${instagramUserId}/media`, null, {
      params: {
        image_url: draft.imageUrl,
        caption: draft.caption,
        access_token: accessToken,
      },
    });

    const publish = await axios.post<{ id: string }>(`${GRAPH_API_BASE}/${instagramUserId}/media_publish`, null, {
      params: {
        creation_id: media.data.id,
        access_token: accessToken,
      },
    });

    return { id: publish.data.id, success: true };
  } catch (error) {
    throw new Error(`Instagram publish failed: ${getApiError(error, 'Unknown Instagram API error')}`);
  }
}

export async function postToLinkedIn(draft: Pick<PostDraft, 'caption' | 'imageUrl'>): Promise<SocialPostResult> {
  const accessToken = requireEnv('LINKEDIN_ACCESS_TOKEN');
  const organizationId = requireEnv('LINKEDIN_ORGANIZATION_ID');
  const author = `urn:li:organization:${organizationId}`;

  try {
    const response = await axios.post(
      `${LINKEDIN_API_BASE}/ugcPosts`,
      {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: draft.caption,
            },
            shareMediaCategory: draft.imageUrl ? 'ARTICLE' : 'NONE',
            ...(draft.imageUrl
              ? {
                  media: [
                    {
                      status: 'READY',
                      originalUrl: draft.imageUrl,
                    },
                  ],
                }
              : {}),
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    );

    const linkedInId = response.headers['x-restli-id'];
    return { id: Array.isArray(linkedInId) ? linkedInId[0] : linkedInId, success: true };
  } catch (error) {
    throw new Error(`LinkedIn publish failed: ${getApiError(error, 'Unknown LinkedIn API error')}`);
  }
}

export async function fetchInstagramEngagement(mediaId: string) {
  const accessToken = requireEnv('INSTAGRAM_ACCESS_TOKEN');

  try {
    const response = await axios.get<InstagramInsight>(`${GRAPH_API_BASE}/${mediaId}`, {
      params: {
        fields: 'like_count,comments_count',
        access_token: accessToken,
      },
    });

    return {
      likes: response.data.like_count || 0,
      comments: response.data.comments_count || 0,
    };
  } catch (error) {
    throw new Error(`Instagram analytics sync failed: ${getApiError(error, 'Unknown Instagram API error')}`);
  }
}

export async function syncInstagramEngagement(post: DashboardPost) {
  if (!post.instagram_media_id) {
    return post;
  }

  const metrics = await fetchInstagramEngagement(post.instagram_media_id);
  const { data, error } = await supabase
    .from('posts')
    .update({
      likes: metrics.likes,
      comments: metrics.comments,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', post.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as DashboardPost;
}

export async function getPostHistory(): Promise<DashboardPost[]> {
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as DashboardPost[];
}
