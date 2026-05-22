import {
  getSettings,
  getCampaigns,
  getPendingLeadsForStep,
  getThreadIdsToCheck,
  markLeadReplied,
  updateLogStatus,
  updateLeadStatus,
  getDailySentCount,
  getLeads,
} from './email-db';
import { validateBusinessEmail } from './email-validator';
import { sendEmail, renderTemplate } from './email-sender';
import { listRepliedThreadIds, getLatestReplyText } from './gmail-reader';
import { generateReply } from './ai-reply';
import { extractCountryFromCompany, isGoodTimeToSend } from './timezone';
import type { Lead, SequencerResult, ReplyDetectionResult } from '../types/email';

const DAILY_CAP = 100;

export async function runSequencer(userId: string): Promise<SequencerResult> {
  const result: SequencerResult = { sent: 0, skipped: 0, errors: [] };

  const [settings, campaigns] = await Promise.all([
    getSettings(userId),
    getCampaigns(userId),
  ]);

  const sentToday = await getDailySentCount(userId);
  const remaining = DAILY_CAP - sentToday;
  if (remaining <= 0) {
    result.errors.push(`Daily sending limit of ${DAILY_CAP} emails reached. Try again tomorrow.`);
    return result;
  }

  let dailyBudget = remaining;

  for (const step of [1, 2, 3] as const) {
    if (dailyBudget <= 0) break;

    const campaign = campaigns.find((c) => c.step === step && c.is_active);
    if (!campaign) {
      result.skipped++;
      continue;
    }

    const leads = await getPendingLeadsForStep(step, campaign, userId);
    if (leads.length === 0) continue;

    for (const lead of leads) {
      if (dailyBudget <= 0) break;

      // ── Pre-flight: validate email before touching the daily budget ──────
      const emailCheck = validateBusinessEmail(lead.email);
      if (!emailCheck.valid) {
        // Auto-spam — bad address stored in DB (e.g. "flags@2x.png"), no send attempt
        await updateLeadStatus(lead.id, 'spam', userId);
        result.errors.push(`Auto-spammed ${lead.email}: ${emailCheck.reason}`);
        result.skipped++;
        continue;
      }

      // Timezone check — skip leads outside 9am–6pm in their country
      const country = extractCountryFromCompany(lead.company);
      if (!isGoodTimeToSend(country)) {
        result.skipped++;
        continue;
      }

      try {
        const renderedBody = renderTemplate(campaign.body, lead);
        const renderedSubject = renderTemplate(campaign.subject, lead);

        const sendResult = await sendEmail({
          to: lead.email,
          subject: renderedSubject,
          body: renderedBody,
          lead,
          campaignId: campaign.id,
          step,
          settings,
          userId,
        });

        if (sendResult.success) {
          result.sent++;
          dailyBudget--;
        } else {
          result.errors.push(`Step ${step} → ${lead.email}: ${sendResult.error}`);
          result.skipped++;
        }
      } catch (err) {
        result.errors.push(`Step ${step} → ${lead.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        result.skipped++;
      }
    }
  }

  return result;
}

export async function runReplyDetection(userId: string): Promise<ReplyDetectionResult> {
  const result: ReplyDetectionResult = { repliesFound: 0, aiRepliesSent: 0, errors: [] };

  const [settings, pendingThreads] = await Promise.all([
    getSettings(userId),
    getThreadIdsToCheck(userId),
  ]);

  if (pendingThreads.length === 0) return result;

  const threadIds = pendingThreads.map((t) => t.threadId);

  let repliedThreadIds: string[];
  try {
    repliedThreadIds = await listRepliedThreadIds(settings, threadIds, userId);
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Gmail API error');
    return result;
  }

  result.repliesFound = repliedThreadIds.length;

  for (const threadId of repliedThreadIds) {
    const thread = pendingThreads.find((t) => t.threadId === threadId);
    if (!thread) continue;

    try {
      await markLeadReplied(thread.leadId);
      await updateLogStatus(thread.logId, 'replied');

      let replyText = '';
      try {
        replyText = await getLatestReplyText(settings, threadId, userId);
      } catch {
        replyText = '(Could not fetch reply text)';
      }

      const aiBody = await generateReply({
        originalSubject: thread.subject,
        originalBody: thread.body,
        replyText,
        settings,
      });

      const allLeads: Lead[] = await getLeads(userId);
      const lead: Lead | undefined = allLeads.find((l) => l.id === thread.leadId);
      if (!lead) continue;

      await sendEmail({
        to: lead.email,
        subject: `Re: ${thread.subject}`,
        body: aiBody,
        lead,
        step: 0,
        settings,
        userId,
      });

      result.aiRepliesSent++;
    } catch (err) {
      result.errors.push(`Reply to thread ${threadId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return result;
}
