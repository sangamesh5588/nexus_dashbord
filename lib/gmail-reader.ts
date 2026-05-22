import { google } from 'googleapis';
import { upsertSettings } from './email-db';
import type { EmailSettings } from '../types/email';

const CLIENT_ID = process.env.GMAIL_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_OAUTH_REDIRECT_URI ?? 'http://localhost:3000/api/email/oauth/callback';

export function getOAuthClient(settings?: EmailSettings) {
  const client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  if (settings?.gmail_oauth_access_token) {
    client.setCredentials({
      access_token: settings.gmail_oauth_access_token,
      refresh_token: settings.gmail_oauth_refresh_token ?? undefined,
      expiry_date: settings.gmail_oauth_token_expiry
        ? new Date(settings.gmail_oauth_token_expiry).getTime()
        : undefined,
    });
  }
  return client;
}

export function getAuthUrl(userId: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    state: userId, // passed back in callback so we know whose settings to save
  });
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<{ accessToken: string; refreshToken: string; expiry: string }> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return {
    accessToken: tokens.access_token ?? '',
    refreshToken: tokens.refresh_token ?? '',
    expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : new Date(Date.now() + 3600000).toISOString(),
  };
}

async function ensureFreshToken(settings: EmailSettings, userId: string): Promise<EmailSettings> {
  if (!settings.gmail_oauth_token_expiry) return settings;
  const expiresAt = new Date(settings.gmail_oauth_token_expiry).getTime();
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() + fiveMinutes < expiresAt) return settings;

  const client = getOAuthClient(settings);
  const { credentials } = await client.refreshAccessToken();
  const updated = await upsertSettings(userId, {
    gmail_oauth_access_token: credentials.access_token ?? settings.gmail_oauth_access_token,
    gmail_oauth_token_expiry: credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : settings.gmail_oauth_token_expiry,
  });
  return updated;
}

export async function listRepliedThreadIds(
  settings: EmailSettings,
  threadIds: string[],
  userId: string,
): Promise<string[]> {
  if (!settings.gmail_oauth_refresh_token) {
    throw new Error('Gmail is not connected for reply detection. Set up OAuth in Settings.');
  }
  if (threadIds.length === 0) return [];

  const fresh = await ensureFreshToken(settings, userId);
  const auth = getOAuthClient(fresh);
  const gmail = google.gmail({ version: 'v1', auth });

  const replied: string[] = [];
  const BATCH = 10;

  for (let i = 0; i < threadIds.length; i += BATCH) {
    const chunk = threadIds.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (threadId) => {
        try {
          const res = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'minimal' });
          const messageCount = res.data.messages?.length ?? 0;
          if (messageCount > 1) replied.push(threadId);
        } catch {
          // thread not found or access error — skip
        }
      }),
    );
  }

  return replied;
}

export async function getLatestReplyText(settings: EmailSettings, threadId: string, userId: string): Promise<string> {
  const fresh = await ensureFreshToken(settings, userId);
  const auth = getOAuthClient(fresh);
  const gmail = google.gmail({ version: 'v1', auth });

  const thread = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
  const messages = thread.data.messages ?? [];
  const latest = messages[messages.length - 1];

  if (!latest) return '';

  const part = latest.payload?.parts?.find((p) => p.mimeType === 'text/plain') ?? latest.payload;
  const encoded = part?.body?.data ?? '';
  if (!encoded) return '';

  return Buffer.from(encoded, 'base64').toString('utf-8');
}
