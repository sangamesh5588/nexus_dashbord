/**
 * One-time setup script:
 * 1. Saves Sangamesh's email settings to Supabase
 * 2. Creates 3 high-converting campaign templates
 *
 * Run with: npx tsx scripts/setup-email.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// â”€â”€â”€ 1. Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function saveSettings() {
  const { error } = await db.from('email_settings').update({
    gmail_address: 'nexus.appdevloper@gmail.com',
    gmail_app_password: 'niezqsnrjolqntdf',
    sender_display_name: 'Sangamesh | Nexus Software Studio',
    ai_persona_bio: `I'm Sangamesh, founder of Nexus Software Studio â€” a software and web development studio based in Bangalore. We help businesses in the UAE and Gulf build fast, modern websites and digital tools that actually convert visitors into clients. I write short, direct emails. I focus on results, not fluff. When someone replies, I respond quickly and personally â€” no templates, no corporate tone.`,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);

  if (error) {
    console.error('âŒ Settings save failed:', error.message);
  } else {
    console.log('âœ“ Settings saved â€” Sender: Sangamesh | Nexus Software Studio');
  }
}

// â”€â”€â”€ 2. Campaign Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CAMPAIGNS = [
  {
    step: 1,
    name: 'First Outreach',
    delay_days: 0,
    subject: 'Quick idea for {{name}} â€” takes 30 seconds to read',
    body: `Hi {{name}},

I came across {{name}} online and noticed {{custom_note}}

I'm Sangamesh, founder of Nexus Software Studio. We build high-converting websites and digital tools for businesses in the UAE â€” helping them turn online visitors into real paying clients.

Most businesses in {{company}} are leaving money on the table with slow or outdated websites. We fix that fast.

Would a quick 15-minute call this week make sense?

Best,
Sangamesh
Nexus Software Studio | Software & Web Studio
ðŸ“§ nexus.appdevloper@gmail.com`,
  },
  {
    step: 2,
    name: 'Follow-up',
    delay_days: 3,
    subject: 'Did you see my note, {{name}}?',
    body: `Hi {{name}},

Just following up on my email from a few days ago about your online presence.

I know inboxes get busy â€” totally understand. But I genuinely think there's a quick win here for {{name}} that could bring in more leads within 30 days.

Here's what we typically do in 2â€“3 weeks:
âœ“ Fast, mobile-first website redesign
âœ“ SEO setup so local clients can find you
âœ“ WhatsApp / enquiry integration

Happy to send over a quick 5-min Loom walkthrough of what this could look like for your business â€” zero commitment.

Worth a look?

Sangamesh
Nexus Software Studio`,
  },
  {
    step: 3,
    name: 'Final Follow-up',
    delay_days: 5,
    subject: 'Last one from me â€” {{name}}',
    body: `Hi {{name}},

I'll keep this short â€” this is my last email.

If you're happy with your current online presence and lead flow, that's great and I won't bother you again.

But if there's even a small chance you'd like to explore what a better website could do for {{name}}, just reply with "yes" and I'll send over some examples.

Either way, I wish you and the team all the best.

Sangamesh
Nexus Software Studio | Software & Web Studio`,
  },
];

async function saveCampaigns() {
  for (const c of CAMPAIGNS) {
    // Check if step already exists
    const { data: existing } = await db
      .from('email_campaigns')
      .select('id')
      .eq('step', c.step)
      .maybeSingle();

    let error;
    if (existing?.id) {
      ({ error } = await db
        .from('email_campaigns')
        .update({ ...c, updated_at: new Date().toISOString() })
        .eq('id', existing.id));
    } else {
      ({ error } = await db
        .from('email_campaigns')
        .insert({ ...c, is_active: true }));
    }

    if (error) {
      console.error(`âŒ Step ${c.step} save failed:`, error.message);
    } else {
      console.log(`âœ“ Step ${c.step} (${c.name}) saved â€” delay: ${c.delay_days} days`);
    }
  }
}

// â”€â”€â”€ Run â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function main() {
  console.log('\nðŸš€ Setting up Nexus Software Studio email system...\n');
  await saveSettings();
  await saveCampaigns();
  console.log('\nâœ… Done! Open /email/settings and /email/campaigns to verify.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
