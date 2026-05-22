import { NextRequest, NextResponse } from 'next/server';
import { getTemplateById, getLeadsByIds, getSettings } from '../../../../lib/email-db';
import { sendEmail, renderTemplate } from '../../../../lib/email-sender';
import { getUserFromRequest } from '../../../../lib/get-user';

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const body = await request.json() as {
      leadIds: string[];
      templateId: string;
      step: 1 | 2 | 3;
    };
    const { leadIds, templateId, step } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0)
      return NextResponse.json({ error: 'No leads provided.' }, { status: 400 });
    if (![1, 2, 3].includes(step))
      return NextResponse.json({ error: 'Step must be 1, 2, or 3.' }, { status: 400 });
    if (!templateId)
      return NextResponse.json({ error: 'templateId is required.' }, { status: 400 });

    const [template, leads, settings] = await Promise.all([
      getTemplateById(templateId, userId),
      getLeadsByIds(leadIds, userId),
      getSettings(userId),
    ]);

    if (!template) return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
    if (leads.length === 0) return NextResponse.json({ error: 'No eligible leads found.' }, { status: 400 });

    // Check Gmail credentials before looping — fail fast with a clear message
    const gmailUser = settings.gmail_address ?? process.env.GMAIL_ADDRESS;
    const gmailPass = settings.gmail_app_password ?? process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailPass) {
      return NextResponse.json({
        error: 'Gmail is not configured. Go to Email → Settings and add your Gmail address and App Password.',
      }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      // Skip phone-only leads (no-website leads saved with placeholder emails)
      if (lead.email.endsWith('@nexus.local')) {
        skipped++;
        continue;
      }

      const result = await sendEmail({
        to: lead.email,
        subject: renderTemplate(template.subject, lead),
        body: renderTemplate(template.body, lead),
        imageUrl: template.image_url ?? undefined,
        lead,
        campaignId: undefined,
        step,
        settings,
        userId,
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`${lead.company ?? lead.email}: ${result.error ?? 'Unknown error'}`);
      }
    }

    if (skipped > 0 && errors.length === 0 && sent === 0) {
      errors.push(`${skipped} lead${skipped !== 1 ? 's' : ''} skipped — phone-only leads have no email address.`);
    }

    return NextResponse.json({ sent, failed, skipped, errors });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed.' }, { status: 500 });
  }
}
