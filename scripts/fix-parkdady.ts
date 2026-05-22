/**
 * One-time fix: replace every "ParkDady" reference in the database
 * with "Nexus Software Studio".
 *
 * Touches:
 *  - email_settings  → sender_display_name, ai_persona_bio
 *  - email_campaigns → body (all 3 steps)
 *
 * Run with:  npx tsx scripts/fix-parkdady.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const OLD = /ParkDady/g;
const NEW = 'Nexus Software Studio';

async function fixSettings() {
  const { data, error } = await db
    .from('email_settings')
    .select('user_id, sender_display_name, ai_persona_bio');

  if (error) { console.error('❌ fetch settings:', error.message); return; }
  if (!data?.length) { console.log('  no settings rows found'); return; }

  for (const row of data) {
    const newName = row.sender_display_name?.replace(OLD, NEW) ?? row.sender_display_name;
    const newBio  = row.ai_persona_bio?.replace(OLD, NEW)  ?? row.ai_persona_bio;

    if (newName === row.sender_display_name && newBio === row.ai_persona_bio) {
      console.log(`  settings [${row.user_id?.slice(0, 8)}…] — no change needed`);
      continue;
    }

    const { error: upErr } = await db
      .from('email_settings')
      .update({ sender_display_name: newName, ai_persona_bio: newBio })
      .eq('user_id', row.user_id);

    if (upErr) {
      console.error(`  ❌ settings [${row.user_id?.slice(0, 8)}…]:`, upErr.message);
    } else {
      console.log(`  ✓ settings [${row.user_id?.slice(0, 8)}…] patched`);
      if (newName !== row.sender_display_name) console.log(`    display_name: "${row.sender_display_name}" → "${newName}"`);
      if (newBio   !== row.ai_persona_bio)     console.log(`    bio updated`);
    }
  }
}

async function fixCampaigns() {
  const { data, error } = await db
    .from('email_campaigns')
    .select('id, step, name, body');

  if (error) { console.error('❌ fetch campaigns:', error.message); return; }
  if (!data?.length) { console.log('  no campaign rows found'); return; }

  for (const row of data) {
    const newBody = row.body?.replace(OLD, NEW) ?? row.body;

    if (newBody === row.body) {
      console.log(`  campaign step ${row.step} "${row.name}" — no change needed`);
      continue;
    }

    const { error: upErr } = await db
      .from('email_campaigns')
      .update({ body: newBody })
      .eq('id', row.id);

    if (upErr) {
      console.error(`  ❌ campaign step ${row.step} "${row.name}":`, upErr.message);
    } else {
      console.log(`  ✓ campaign step ${row.step} "${row.name}" patched`);
    }
  }
}

async function main() {
  console.log('\n🔧 Replacing "ParkDady" → "Nexus Software Studio" in database…\n');

  console.log('📋 email_settings:');
  await fixSettings();

  console.log('\n📋 email_campaigns:');
  await fixCampaigns();

  console.log('\n✅ Done.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
