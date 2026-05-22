/**
 * Automated cron endpoint — called by cron-job.org (or any external scheduler)
 *
 * Runs for EVERY user who has Gmail SMTP configured:
 *   - runSequencer(userId) — sends pending follow-up emails
 *
 * Security: guarded by CRON_SECRET env var.
 * Add as Authorization: Bearer <CRON_SECRET> header in cron-job.org.
 *
 * Recommended schedule: every 15 minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '../../../../lib/email-db';
import { runSequencer } from '../../../../lib/sequencer';

export const maxDuration = 300; // 5 min max — may take a while across many users

export async function GET(request: NextRequest) {
  // ── Auth: only allow requests with the correct CRON_SECRET ──────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
  }

  const db = getAdminClient();

  // ── Find all users who have Gmail SMTP configured ────────────────────────
  const { data: configuredUsers, error } = await db
    .from('email_settings')
    .select('user_id')
    .not('gmail_address', 'is', null)
    .not('gmail_app_password', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = configuredUsers ?? [];
  console.log(`[cron] Processing ${users.length} user(s) with Gmail configured`);

  const results: {
    userId: string;
    sequencer?: { sent: number; skipped: number; errors: string[] };
    error?: string;
  }[] = [];

  for (const { user_id } of users) {
    try {
      const seqResult = await runSequencer(user_id);
      results.push({ userId: user_id, sequencer: seqResult });
      console.log(`[cron] User ${user_id.slice(0, 8)}… → sent: ${seqResult.sent}, skipped: ${seqResult.skipped}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ userId: user_id, error: msg });
      console.error(`[cron] User ${user_id.slice(0, 8)}… failed:`, msg);
    }
  }

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    usersProcessed: users.length,
    results,
  });
}
