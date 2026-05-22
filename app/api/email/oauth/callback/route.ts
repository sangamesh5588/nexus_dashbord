import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '../../../../../lib/gmail-reader';
import { upsertSettings } from '../../../../../lib/email-db';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const state = request.nextUrl.searchParams.get('state'); // userId stored in OAuth state param

  if (error) {
    return NextResponse.redirect(new URL('/email/settings?oauth=denied', request.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/email/settings?oauth=error', request.url));
  }
  if (!state) {
    // State missing — can't associate tokens with a user
    return NextResponse.redirect(new URL('/email/settings?oauth=error', request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await upsertSettings(state, {
      gmail_oauth_access_token: tokens.accessToken,
      gmail_oauth_refresh_token: tokens.refreshToken,
      gmail_oauth_token_expiry: tokens.expiry,
    });
    return NextResponse.redirect(new URL('/email/settings?oauth=success', request.url));
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/email/settings?oauth=error', request.url));
  }
}
