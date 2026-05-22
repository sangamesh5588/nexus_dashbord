import { callAI } from './ai-provider';
import type { EmailSettings } from '../types/email';

export async function generateReply(opts: {
  originalSubject: string;
  originalBody: string;
  replyText: string;
  settings: EmailSettings;
}): Promise<string> {
  const { originalSubject, originalBody, replyText, settings } = opts;

  const name = settings.sender_display_name ?? 'me';
  const persona = settings.ai_persona_bio?.trim()
    ? settings.ai_persona_bio.trim()
    : `I am ${name}. I write concise, professional, and friendly emails.`;

  const system = `You are ${name}. Write email replies in first person on behalf of this person.

Bio / Communication style:
${persona}

Rules:
- Write in first person as ${name}
- Keep replies concise and genuine (2-4 short paragraphs max)
- Match the tone of the bio above
- Never mention you are an AI
- Do not add a subject line — write only the email body
- End with a natural sign-off using the name: ${name}`;

  const user = `I sent this email:
Subject: ${originalSubject}
Body:
${originalBody}

The recipient replied with:
${replyText}

Write my reply to their message.`;

  return callAI(system, user, settings, 500);
}
