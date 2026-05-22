import { NextRequest, NextResponse } from 'next/server';
import { getSettings, upsertSettings } from '../../../../lib/email-db';
import { getUserFromRequest } from '../../../../lib/get-user';
import type { EmailSettings } from '../../../../types/email';

export async function GET(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const settings = await getSettings(userId);
    return NextResponse.json({
      settings: {
        ...settings,
        // Mask secrets — client only needs to know whether they are set
        gmail_app_password: settings.gmail_app_password ? '••••••••' : null,
        gmail_oauth_access_token: settings.gmail_oauth_access_token ? '••••••••' : null,
        ai_api_key: settings.ai_api_key ? '••••••••' : null,
        is_gmail_connected: Boolean(settings.gmail_oauth_refresh_token),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch settings.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const body = await request.json() as Partial<EmailSettings> & { gmail_app_password?: string };
    const update: Partial<Omit<EmailSettings, 'user_id'>> = {};

    if (body.gmail_address !== undefined) update.gmail_address = body.gmail_address;
    if (body.sender_display_name !== undefined) update.sender_display_name = body.sender_display_name;
    if (body.ai_persona_bio !== undefined) update.ai_persona_bio = body.ai_persona_bio;
    if (body.ai_provider !== undefined) update.ai_provider = body.ai_provider;
    if (body.profile_role !== undefined) update.profile_role = body.profile_role;
    if (body.profile_company !== undefined) update.profile_company = body.profile_company;

    // Only save passwords/keys if user typed a new value (not the masked placeholder)
    if (body.gmail_app_password && !body.gmail_app_password.includes('•')) {
      update.gmail_app_password = body.gmail_app_password;
    }
    if (body.ai_api_key && !body.ai_api_key.includes('•')) {
      update.ai_api_key = body.ai_api_key;
    }

    const settings = await upsertSettings(userId, update);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save settings.' }, { status: 400 });
  }
}
