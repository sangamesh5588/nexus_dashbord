/**
 * One-time migration script
 * ─────────────────────────
 * All leads, campaigns, logs, and settings that were created before the
 * multi-user system have user_id = NULL. This script finds the Supabase
 * user whose email matches OWNER_EMAIL and assigns every orphaned row to them.
 *
 * Run once:  npx tsx scripts/assign-existing-data.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

// ← Change this to the Google email you'll use to log in
const OWNER_EMAIL = 'nexus.appdevloper@gmail.com';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  console.log('\n🔍 Looking up user:', OWNER_EMAIL);

  // Find the user in Supabase Auth by email
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers();
  if (listErr) { console.error('❌ Could not list users:', listErr.message); process.exit(1); }

  const owner = users.find(
    (u) => u.email === OWNER_EMAIL || u.user_metadata?.email === OWNER_EMAIL,
  );

  if (!owner) {
    console.error(`\n❌ User "${OWNER_EMAIL}" not found in Supabase Auth.`);
    console.error('   → Sign in once at http://localhost:3000/login first, then re-run this script.');
    process.exit(1);
  }

  const userId = owner.id;
  console.log('✓ Found user:', userId);

  // ── 1. leads ──────────────────────────────────────────────────────────────
  const { error: leadsErr } = await db
    .from('leads')
    .update({ user_id: userId })
    .is('user_id', null);

  if (leadsErr) console.error('❌ leads:', leadsErr.message);
  else console.log(`✓ Assigned all null-owner leads to ${OWNER_EMAIL}`);

  // ── 2. email_campaigns ────────────────────────────────────────────────────
  const { error: campaignsErr } = await db
    .from('email_campaigns')
    .update({ user_id: userId })
    .is('user_id', null);

  if (campaignsErr) console.error('❌ campaigns:', campaignsErr.message);
  else console.log('✓ Assigned all null-owner campaigns');

  // ── 3. email_logs ─────────────────────────────────────────────────────────
  const { error: logsErr } = await db
    .from('email_logs')
    .update({ user_id: userId })
    .is('user_id', null);

  if (logsErr) console.error('❌ logs:', logsErr.message);
  else console.log('✓ Assigned all null-owner email logs');

  // ── 4. email_settings ─────────────────────────────────────────────────────
  // Settings now use user_id as PRIMARY KEY. If there's no row for this user,
  // check if there's a leftover row with a different user_id or null and migrate it.
  const { data: existingSettings } = await db
    .from('email_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingSettings) {
    // Look for any settings row to copy into the new user_id slot
    const { data: orphanSettings } = await db
      .from('email_settings')
      .select('*')
      .neq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (orphanSettings) {
      const { user_id: _old, ...rest } = orphanSettings as Record<string, unknown>;
      void _old;
      const { error: settingsErr } = await db
        .from('email_settings')
        .upsert({ ...rest, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

      if (settingsErr) console.error('❌ settings:', settingsErr.message);
      else console.log(`✓ Migrated email settings to ${OWNER_EMAIL}`);
    } else {
      console.log('ℹ No orphan settings found — you will need to fill in settings at /email/settings');
    }
  } else {
    console.log('✓ Email settings already assigned to this user — no action needed');
  }

  console.log('\n✅ Done! All existing data is now owned by:', OWNER_EMAIL);
  console.log('   Open /email to verify everything looks correct.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
