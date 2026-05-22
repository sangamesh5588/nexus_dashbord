import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/get-user';
import { testAIConnection } from '../../../../lib/ai-provider';
import type { AIProvider, EmailSettings } from '../../../../types/email';

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const { provider, apiKey } = await request.json() as { provider: AIProvider; apiKey: string };

  if (!provider || !apiKey?.trim()) {
    return NextResponse.json({ error: 'Provider and API key are required.' }, { status: 400 });
  }

  // Build a temporary settings object just to test — don't need to save yet
  const tempSettings: EmailSettings = {
    user_id: userId,
    gmail_address: null, gmail_app_password: null,
    sender_display_name: null, ai_persona_bio: null,
    gmail_oauth_access_token: null, gmail_oauth_refresh_token: null,
    gmail_oauth_token_expiry: null,
    ai_provider: provider,
    ai_api_key: apiKey,
    profile_role: null, profile_company: null,
    updated_at: new Date().toISOString(),
  };

  try {
    const model = await testAIConnection(tempSettings);
    return NextResponse.json({ ok: true, model });
  } catch (err) {
    let msg = err instanceof Error ? err.message : 'Connection failed.';
    // Strip raw JSON from error messages — show only the human-readable part
    try {
      const jsonStart = msg.indexOf('{');
      if (jsonStart !== -1) {
        const parsed = JSON.parse(msg.slice(jsonStart)) as { error?: { message?: string }; message?: string };
        msg = parsed?.error?.message ?? parsed?.message ?? msg;
      }
    } catch { /* leave msg as-is */ }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
