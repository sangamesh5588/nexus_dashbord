import nodemailer from 'nodemailer';
import { logEmail, updateLogStatus, updateLeadStatus } from './email-db';
import type { Lead, EmailSettings, SendEmailOpts, SendResult } from '../types/email';

export function renderTemplate(body: string, lead: Lead): string {
  return body
    .replace(/\{\{name\}\}/g, lead.name ?? '')
    .replace(/\{\{company\}\}/g, lead.company ?? '')
    .replace(/\{\{custom_note\}\}/g, lead.custom_note ?? '');
}

function createTransport(settings: EmailSettings) {
  const user = settings.gmail_address ?? process.env.GMAIL_ADDRESS;
  const pass = settings.gmail_app_password ?? process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('Gmail credentials are not configured. Add them in Email Settings.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

export async function sendEmail(opts: SendEmailOpts): Promise<SendResult> {
  const { to, subject, body, imageUrl, lead, campaignId, step, settings, userId } = opts;

  const log = await logEmail({
    lead_id: lead.id,
    campaign_id: campaignId ?? null,
    step,
    subject,
    body,
    status: 'sent',
    gmail_thread_id: null,
    gmail_message_id: null,
    error_message: null,
  }, userId);

  try {
    const transport = createTransport(settings);
    const fromName = settings.sender_display_name ?? process.env.GMAIL_SENDER_NAME ?? 'Nexus';
    const fromAddress = settings.gmail_address ?? process.env.GMAIL_ADDRESS ?? '';

    const renderedText = renderTemplate(body, lead);
    const renderedHtml = renderedText.replace(/\n/g, '<br>') +
      (imageUrl ? `<br><br><img src="${imageUrl}" alt="attachment" style="max-width:100%;height:auto;border-radius:8px;" />` : '');

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      text: renderedText,
      html: renderedHtml,
    });

    const messageId: string = (info.messageId as string) ?? '';
    const threadId = messageId.replace(/[<>]/g, '').split('@')[0] ?? '';

    // log already has status='sent' from logEmail(); just patch the IDs
    const db = (await import('./email-db')).getAdminClient();
    await db
      .from('email_logs')
      .update({ gmail_message_id: messageId, gmail_thread_id: threadId })
      .eq('id', log.id);

    return { success: true, logId: log.id, threadId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown send error';
    await updateLogStatus(log.id, 'failed', message);
    return { success: false, logId: log.id, error: message };
  }
}
