import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '../../../../lib/gmail-reader';

export async function GET(request: NextRequest) {
  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;

  if (!clientId || clientId.includes('your_') || !clientSecret || clientSecret.includes('your_')) {
    return NextResponse.redirect(
      new URL('/email/settings?oauth=not_configured', 'http://localhost:3000'),
    );
  }

  // The userId must be passed as a query param so we can store it in OAuth state
  // and know whose settings to save when Google redirects back.
  const uid = request.nextUrl.searchParams.get('uid');
  if (!uid) {
    return NextResponse.redirect(
      new URL('/email/settings?oauth=error', request.url),
    );
  }

  try {
    const url = getAuthUrl(uid);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(
      new URL('/email/settings?oauth=error', request.url),
    );
  }
}
