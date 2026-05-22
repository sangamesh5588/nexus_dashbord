import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Lead, LeadTab, LeadWithStep, EmailCampaign, EmailLog, EmailSettings, ParsedLead, EmailStats, MessageTemplate } from '../types/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getAdminClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your_') || serviceRoleKey.includes('your_')) {
    throw new Error('Supabase service credentials are not configured.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export async function getExistingEmails(userId: string): Promise<Set<string>> {
  const db = getAdminClient();
  const { data, error } = await db.from('leads').select('email').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r: { email: string }) => r.email.toLowerCase().trim()));
}

export async function getLeads(userId: string): Promise<Lead[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function upsertLeads(rows: ParsedLead[], batch: string, userId: string): Promise<number> {
  const db = getAdminClient();
  const records = rows.map((r) => ({
    email: r.email.toLowerCase().trim(),
    name: r.name ?? null,
    company: r.company ?? null,
    custom_note: r.custom_note ?? null,
    upload_batch: batch,
    status: 'active',
    user_id: userId,
  }));
  // Upsert on email+user_id combination — each user owns their own lead pool
  const { error, count } = await db
    .from('leads')
    .upsert(records, { onConflict: 'email,user_id', ignoreDuplicates: false })
    .select();
  if (error) throw error;
  return count ?? rows.length;
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export async function getCampaigns(userId: string): Promise<EmailCampaign[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('email_campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('step', { ascending: true });
  if (error) throw error;
  return data as EmailCampaign[];
}

export async function upsertCampaign(
  step: number,
  data: Partial<EmailCampaign>,
  userId: string,
): Promise<EmailCampaign> {
  const db = getAdminClient();
  const { data: existing } = await db
    .from('email_campaigns')
    .select('id')
    .eq('step', step)
    .eq('user_id', userId)
    .maybeSingle();

  let result;
  if (existing?.id) {
    const { data: updated, error } = await db
      .from('email_campaigns')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    result = updated;
  } else {
    const { data: inserted, error } = await db
      .from('email_campaigns')
      .insert({ step, ...data, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    result = inserted;
  }
  return result as EmailCampaign;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(userId: string): Promise<EmailSettings> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('email_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  // Return defaults for new users who have no settings row yet
  return (data as EmailSettings) ?? {
    user_id: userId,
    gmail_address: null,
    gmail_app_password: null,
    sender_display_name: null,
    ai_persona_bio: null,
    gmail_oauth_access_token: null,
    gmail_oauth_refresh_token: null,
    gmail_oauth_token_expiry: null,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertSettings(
  userId: string,
  data: Partial<Omit<EmailSettings, 'user_id'>>,
): Promise<EmailSettings> {
  const db = getAdminClient();
  const { data: updated, error } = await db
    .from('email_settings')
    .upsert(
      { user_id: userId, ...data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return updated as EmailSettings;
}

// ─── Email Logs ───────────────────────────────────────────────────────────────

export async function logEmail(
  data: Omit<EmailLog, 'id' | 'sent_at'>,
  userId: string,
): Promise<EmailLog> {
  const db = getAdminClient();
  const { data: log, error } = await db
    .from('email_logs')
    .insert({ ...data, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return log as EmailLog;
}

export async function updateLogStatus(
  id: string,
  status: 'replied' | 'failed',
  errorMessage?: string,
): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('email_logs')
    .update({ status, ...(errorMessage ? { error_message: errorMessage } : {}) })
    .eq('id', id);
  if (error) throw error;
}

export async function markLeadReplied(leadId: string): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('leads')
    .update({ status: 'replied', updated_at: new Date().toISOString() })
    .eq('id', leadId);
  if (error) throw error;
}

export async function updateLeadStatus(
  leadId: string,
  status: Lead['status'],
  userId: string,
): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('user_id', userId); // ownership guard
  if (error) throw error;
}

// Returns leads for a given tab with their max step attached
export async function getLeadsByTab(
  tab: LeadTab,
  userId: string,
): Promise<LeadWithStep[]> {
  const db = getAdminClient();

  // Fetch all step logs for this user once
  const { data: logs } = await db
    .from('email_logs')
    .select('lead_id, step')
    .eq('user_id', userId)
    .in('step', [1, 2, 3])
    .eq('status', 'sent');

  // Build map: leadId → max step sent
  const maxStepMap = new Map<string, number>();
  for (const row of (logs ?? []) as { lead_id: string; step: number }[]) {
    const cur = maxStepMap.get(row.lead_id) ?? 0;
    if (row.step > cur) maxStepMap.set(row.lead_id, row.step);
  }

  const allSentIds = [...maxStepMap.keys()];

  let query = db.from('leads').select('*').eq('user_id', userId);

  if (tab === 'spam') {
    query = query.eq('status', 'spam');
  } else if (tab === 'all') {
    query = query.neq('status', 'spam');
  } else if (tab === 'step1') {
    // Active leads with NO email sent yet
    query = query.eq('status', 'active');
    if (allSentIds.length > 0) {
      query = query.not('id', 'in', `(${allSentIds.join(',')})`);
    }
  } else if (tab === 'step2') {
    const step2Ids = [...maxStepMap.entries()]
      .filter(([, s]) => s === 1).map(([id]) => id);
    if (step2Ids.length === 0) return [];
    query = query.eq('status', 'active').in('id', step2Ids);
  } else if (tab === 'step3') {
    const step3Ids = [...maxStepMap.entries()]
      .filter(([, s]) => s === 2).map(([id]) => id);
    if (step3Ids.length === 0) return [];
    query = query.eq('status', 'active').in('id', step3Ids);
  } else if (tab === 'done') {
    const doneIds = [...maxStepMap.entries()]
      .filter(([, s]) => s >= 3).map(([id]) => id);
    if (doneIds.length === 0) return [];
    query = query.in('id', doneIds);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data as Lead[]).map((lead) => ({
    ...lead,
    max_step: maxStepMap.get(lead.id) ?? null,
  }));
}

export async function getLeadTabCounts(userId: string): Promise<Record<LeadTab, number>> {
  const db = getAdminClient();

  const [{ data: logs }, { count: spamCount }, { count: allCount }] = await Promise.all([
    db.from('email_logs').select('lead_id, step').eq('user_id', userId).in('step', [1, 2, 3]).eq('status', 'sent'),
    db.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'spam'),
    db.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'spam'),
  ]);

  const maxStepMap = new Map<string, number>();
  for (const row of (logs ?? []) as { lead_id: string; step: number }[]) {
    const cur = maxStepMap.get(row.lead_id) ?? 0;
    if (row.step > cur) maxStepMap.set(row.lead_id, row.step);
  }

  const allSentIds = new Set(maxStepMap.keys());
  const { count: activeCount } = await db
    .from('leads').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'active');

  const step1 = (activeCount ?? 0) - allSentIds.size;
  let step2 = 0, step3 = 0, done = 0;
  for (const [, s] of maxStepMap) {
    if (s === 1) step2++;
    else if (s === 2) step3++;
    else if (s >= 3) done++;
  }

  return {
    all: allCount ?? 0,
    step1: Math.max(0, step1),
    step2,
    step3,
    done,
    spam: spamCount ?? 0,
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getDailySentCount(userId: string): Promise<number> {
  const db = getAdminClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await db
    .from('email_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'sent')
    .gte('sent_at', todayStart.toISOString());
  return count ?? 0;
}

export async function getEmailStats(userId: string): Promise<EmailStats> {
  const db = getAdminClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [
    { count: totalLeads },
    { count: activeLeads },
    { count: repliedLeads },
    { count: totalSent },
    { count: sentToday },
  ] = await Promise.all([
    db.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
    db.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'replied'),
    db.from('email_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'sent'),
    db.from('email_logs').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'sent').gte('sent_at', todayStart.toISOString()),
  ]);

  // Pipeline: how many leads are at each stage
  const { data: logCounts } = await db
    .from('email_logs')
    .select('lead_id, step')
    .eq('user_id', userId)
    .in('step', [1, 2, 3])
    .eq('status', 'sent');

  const maxStepByLead = new Map<string, number>();
  for (const row of (logCounts ?? []) as { lead_id: string; step: number }[]) {
    const current = maxStepByLead.get(row.lead_id) ?? 0;
    if (row.step > current) maxStepByLead.set(row.lead_id, row.step);
  }
  const emailedLeadIds = new Set(maxStepByLead.keys());

  const step1Pending = (activeLeads ?? 0) - emailedLeadIds.size;
  let step2Pending = 0, step3Pending = 0, allStepsDone = 0;
  for (const [, maxStep] of maxStepByLead) {
    if (maxStep === 1) step2Pending++;
    else if (maxStep === 2) step3Pending++;
    else if (maxStep >= 3) allStepsDone++;
  }

  return {
    totalLeads: totalLeads ?? 0,
    activeLeads: activeLeads ?? 0,
    repliedLeads: repliedLeads ?? 0,
    totalSent: totalSent ?? 0,
    step1Pending: Math.max(0, step1Pending),
    step2Pending,
    step3Pending,
    allStepsDone,
    sentToday: sentToday ?? 0,
  };
}

export async function getRecentActivity(
  userId: string,
  limit = 20,
): Promise<(EmailLog & { lead_email: string; lead_name: string | null })[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('email_logs')
    .select('*, leads(email, name)')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  type Row = {
    id: string; lead_id: string; campaign_id: string | null; step: number;
    subject: string; body: string; status: string; gmail_thread_id: string | null;
    gmail_message_id: string | null; error_message: string | null; sent_at: string;
    leads: { email: string; name: string | null } | null;
  };
  return (data ?? []).map((row: Row) => ({
    ...row,
    status: row.status as EmailLog['status'],
    lead_email: row.leads?.email ?? '',
    lead_name: row.leads?.name ?? null,
  }));
}

// ─── Sequencer helpers ────────────────────────────────────────────────────────

export async function getPendingLeadsForStep(
  step: 1 | 2 | 3,
  campaign: EmailCampaign,
  userId: string,
): Promise<Lead[]> {
  const db = getAdminClient();

  if (step === 1) {
    const { data: sentLeadIds } = await db
      .from('email_logs')
      .select('lead_id')
      .eq('user_id', userId)
      .eq('step', 1);
    const ids = (sentLeadIds ?? []).map((r: { lead_id: string }) => r.lead_id);
    let query = db.from('leads').select('*').eq('user_id', userId).eq('status', 'active');
    if (ids.length > 0) {
      query = query.not('id', 'in', `(${ids.join(',')})`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as Lead[];
  }

  const prevStep = (step - 1) as 1 | 2;
  const cutoff = new Date(Date.now() - campaign.delay_days * 24 * 60 * 60 * 1000).toISOString();

  const { data: prevLogs } = await db
    .from('email_logs')
    .select('lead_id, sent_at')
    .eq('user_id', userId)
    .eq('step', prevStep)
    .lt('sent_at', cutoff);

  if (!prevLogs || prevLogs.length === 0) return [];

  const eligibleLeadIds = (prevLogs as { lead_id: string; sent_at: string }[]).map((r) => r.lead_id);

  const { data: alreadySentLogs } = await db
    .from('email_logs')
    .select('lead_id')
    .eq('user_id', userId)
    .eq('step', step)
    .in('lead_id', eligibleLeadIds);

  const alreadySentIds = new Set((alreadySentLogs ?? []).map((r: { lead_id: string }) => r.lead_id));
  const pendingIds = eligibleLeadIds.filter((id) => !alreadySentIds.has(id));
  if (pendingIds.length === 0) return [];

  const { data, error } = await db
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('id', pendingIds);
  if (error) throw error;
  return data as Lead[];
}

// ─── Message Templates ────────────────────────────────────────────────────────

type SeedTemplate = Omit<MessageTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'image_url' | 'image_name'>;
const SEED_TEMPLATES: SeedTemplate[] = [

  // ── Follow-up 1 — Cold Outreach (5 templates) ─────────────────────────────

  {
    name: 'Quick Question — Curiosity Hook',
    step: 1,
    subject: 'Quick question, {{name}}',
    body: `Hi {{name}},

I'll keep this short — I work with businesses like {{company}} to help them attract more clients and grow revenue without increasing ad spend.

Would it be worth a 10-minute call to see if what we do could be useful for you?

No pitch, no pressure — just a quick conversation.

Best regards`,
    is_default: true,
  },

  {
    name: 'Problem-First Opener',
    step: 1,
    subject: 'Are you getting the results you want, {{name}}?',
    body: `Hi {{name}},

Quick question: is {{company}} currently getting the results you want, or is there room to grow?

I ask because I help businesses like yours generate more leads, close more deals, and build a pipeline that actually works — without the usual headaches.

I'd love to show you exactly what that could look like for {{company}}. Would you have 10 minutes this week?

Best`,
    is_default: true,
  },

  {
    name: 'Noticed Your Business',
    step: 1,
    subject: 'Noticed {{company}} — had a thought',
    body: `Hi {{name}},

I came across {{company}} recently and was genuinely impressed by what you're building.

I help businesses in your space get more clients, increase retention, and scale sustainably. Most see strong results within the first 60 days.

I'd love to share a few ideas specific to {{company}}. Would a 15-minute call this week work for you?

Warm regards`,
    is_default: true,
  },

  {
    name: 'Social Proof First',
    step: 1,
    subject: 'Results we got — could work for {{company}} too',
    body: `Hi {{name}},

We recently helped a business similar to {{company}} increase their client pipeline significantly — without any extra ad spend.

The approach is straightforward and we've refined it over years of working with businesses just like yours.

Would you be open to a quick chat to see if it applies to your situation at {{company}}?

Best`,
    is_default: true,
  },

  {
    name: 'Ultra Short — Two Lines',
    step: 1,
    subject: '{{name}} — 2 minutes?',
    body: `Hi {{name}},

One question: is {{company}} currently open to new strategies that could bring in more clients?

If yes, I have something specific I'd like to share. Takes 10 minutes to explain — would a quick call work this week?

[Your name]`,
    is_default: true,
  },

  // ── Follow-up 2 — Second Touch (5 templates) ──────────────────────────────

  {
    name: 'Gentle Bump',
    step: 2,
    subject: 'Re: Quick question about {{company}}',
    body: `Hi {{name}},

Just following up on my previous email in case it got buried — I know how busy inboxes can get.

I genuinely believe there's an opportunity for {{company}} here and I don't want you to miss it.

Would a quick 10-minute call work for you this week?

Best`,
    is_default: true,
  },

  {
    name: 'New Value Added',
    step: 2,
    subject: 'Something worth sharing for {{company}}',
    body: `Hi {{name}},

Following up from last week — and wanted to add something useful this time.

The businesses growing fastest right now aren't spending more on ads — they're fixing the gaps in their client acquisition system. That's exactly where we help, and the results compound quickly.

I'd love to walk you through what this could look like for {{company}}. Are you free for 15 minutes this week?

Best`,
    is_default: true,
  },

  {
    name: 'Permission Check',
    step: 2,
    subject: 'Should I stop reaching out?',
    body: `Hi {{name}},

I sent you a note last week and haven't heard back — that's completely fine.

I just want to check: is this something {{company}} might be open to in the future, or is the timing just not right?

A quick reply either way would be really helpful. I won't keep following up if it's not relevant for you.

Thanks for your time.`,
    is_default: true,
  },

  {
    name: 'Results-Led Follow-up',
    step: 2,
    subject: 'Quick update — relevant for {{company}}',
    body: `Hi {{name}},

I know you're busy so I'll be brief.

Since my last email, we've helped another client in a similar space grow their client base meaningfully — without any extra marketing budget.

I'm only reaching out again because I genuinely think {{company}} could see similar results. Would you be open to a 15-minute call this week?

Best`,
    is_default: true,
  },

  {
    name: 'Direct Second Touch',
    step: 2,
    subject: 'Still worth a conversation — {{company}}',
    body: `Hi {{name}},

Still think there's something worth exploring for {{company}}.

If the timing isn't right, just let me know and I'll follow up in a few months. If you are open to a quick chat, I have availability this week.

Either way — happy to hear from you.

Best regards`,
    is_default: true,
  },

  // ── Follow-up 3 — Final Note (5 templates) ────────────────────────────────

  {
    name: 'Last Email — Clean Close',
    step: 3,
    subject: 'Last note — {{company}}',
    body: `Hi {{name}},

This will be my last email — I don't want to keep cluttering your inbox.

If helping {{company}} grow ever becomes a priority, please know we're here and I'd love to reconnect whenever the timing is right.

Wishing you and the team all the best.`,
    is_default: true,
  },

  {
    name: 'Door Open',
    step: 3,
    subject: 'Keeping the door open, {{name}}',
    body: `Hi {{name}},

I've reached out a couple of times and totally understand if now isn't the right moment.

I just wanted to make sure you know: the offer still stands. If {{company}} ever needs help growing — more clients, better retention, stronger revenue — we'd love to be part of that journey.

Feel free to reach out anytime. No pressure, no hard feelings.

All the best`,
    is_default: true,
  },

  {
    name: 'Permission to Close',
    step: 3,
    subject: 'Close your file?',
    body: `Hi {{name}},

Should I close your file?

I've sent a few messages without hearing back, and I don't want to keep reaching out if it's not useful for {{company}}.

If you'd like me to check back in a few months, just reply and I'll make a note. Otherwise, I'll assume now isn't the right time and wish you all the best.

Take care.`,
    is_default: true,
  },

  {
    name: 'Final Value Drop',
    step: 3,
    subject: 'One last thought for {{name}}',
    body: `Hi {{name}},

Before I stop reaching out, I wanted to leave you with one thought:

The businesses that grow the fastest aren't the ones with the biggest budgets — they're the ones that find the right leverage early. That's exactly what we help with at {{company}}.

If that ever resonates, I hope you'll reach out. We'd love to help.

Wishing you every success.`,
    is_default: true,
  },

  {
    name: 'Honest Last Email',
    step: 3,
    subject: 'My last email, {{name}}',
    body: `Hi {{name}},

I'll be honest — I've sent a few emails now and I know that can feel like a lot.

I'm only being persistent because I genuinely believe we could add real value to {{company}}. But I also respect your time and your inbox.

This is my last outreach. If you'd ever like to explore what we do, I'm always available.

Thank you for your time, {{name}}.

Best wishes`,
    is_default: true,
  },
];

export async function getTemplates(userId: string): Promise<MessageTemplate[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('message_templates')
    .select('*')
    .eq('user_id', userId)
    .order('step', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as MessageTemplate[];
}

export async function seedDefaultTemplates(userId: string): Promise<void> {
  const db = getAdminClient();
  const { count } = await db
    .from('message_templates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_default', true);
  // Re-seed if user has fewer defaults than the current set (handles upgrades)
  if ((count ?? 0) >= SEED_TEMPLATES.length) return;
  await db.from('message_templates').delete().eq('user_id', userId).eq('is_default', true);
  const rows = SEED_TEMPLATES.map((t) => ({ ...t, user_id: userId }));
  await db.from('message_templates').insert(rows);
}

export async function upsertTemplate(
  data: { id?: string; name: string; step: 1 | 2 | 3; subject: string; body: string; is_default?: boolean; image_url?: string | null; image_name?: string | null },
  userId: string,
): Promise<MessageTemplate> {
  const db = getAdminClient();
  if (data.id) {
    const { data: updated, error } = await db
      .from('message_templates')
      .update({ name: data.name, step: data.step, subject: data.subject, body: data.body, image_url: data.image_url ?? null, image_name: data.image_name ?? null, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return updated as MessageTemplate;
  }
  const { data: inserted, error } = await db
    .from('message_templates')
    .insert({ ...data, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return inserted as MessageTemplate;
}

export async function deleteTemplate(id: string, userId: string): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from('message_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getTemplateById(id: string, userId: string): Promise<MessageTemplate | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('message_templates')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as MessageTemplate | null;
}

export async function getLeadsByIds(ids: string[], userId: string): Promise<Lead[]> {
  if (ids.length === 0) return [];
  const db = getAdminClient();
  const { data, error } = await db
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .in('id', ids)
    .eq('status', 'active');
  if (error) throw error;
  return data as Lead[];
}

export async function getThreadIdsToCheck(
  userId: string,
): Promise<{ logId: string; threadId: string; leadId: string; subject: string; body: string }[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('email_logs')
    .select('id, gmail_thread_id, lead_id, subject, body')
    .eq('user_id', userId)
    .eq('status', 'sent')
    .not('gmail_thread_id', 'is', null)
    .gt('step', 0);
  if (error) throw error;

  type LogRow = { id: string; gmail_thread_id: string | null; lead_id: string; subject: string; body: string };
  return (data ?? []).map((r: LogRow) => ({
    logId: r.id,
    threadId: r.gmail_thread_id!,
    leadId: r.lead_id,
    subject: r.subject,
    body: r.body,
  }));
}
