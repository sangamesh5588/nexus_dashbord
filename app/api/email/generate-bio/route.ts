import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/get-user';
import { getSettings } from '../../../../lib/email-db';
import { callAI } from '../../../../lib/ai-provider';

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const { name, role, company } = await request.json() as {
    name: string; role: string; company: string;
  };

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const settings = await getSettings(userId);

  const system = `You write short, humanised, first-person email bios used in cold outreach.
Rules: 2-3 sentences max. Direct, warm, personal — no corporate buzzwords.
Write in first person. Sound like a real person, not a LinkedIn profile.`;

  const user = `Name: ${name}
Role: ${role || 'Business Owner'}
Company: ${company || 'my company'}

Write a short bio that explains who I am and what I do, in my voice.`;

  try {
    const bio = await callAI(system, user, settings, 150);
    return NextResponse.json({ bio });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI generation failed.' },
      { status: 400 },
    );
  }
}
