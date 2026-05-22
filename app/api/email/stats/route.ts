import { NextRequest, NextResponse } from 'next/server';
import { getEmailStats, getRecentActivity } from '../../../../lib/email-db';
import { getUserFromRequest } from '../../../../lib/get-user';

export async function GET(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const [stats, recentActivity] = await Promise.all([
      getEmailStats(userId),
      getRecentActivity(userId, 20),
    ]);
    return NextResponse.json({ stats, recentActivity });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch stats.' }, { status: 400 });
  }
}
