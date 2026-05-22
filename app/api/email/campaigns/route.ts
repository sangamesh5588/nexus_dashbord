import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, upsertCampaign } from '../../../../lib/email-db';
import { getUserFromRequest } from '../../../../lib/get-user';

export async function GET(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const campaigns = await getCampaigns(userId);
    return NextResponse.json({ campaigns });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch campaigns.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const body = await request.json() as {
      step: number; name: string; subject: string; body: string; delay_days: number; is_active?: boolean;
    };
    const { step, name, subject, body: templateBody, delay_days, is_active } = body;

    if (!step || ![1, 2, 3].includes(step))
      return NextResponse.json({ error: 'Step must be 1, 2, or 3.' }, { status: 400 });
    if (!name?.trim())
      return NextResponse.json({ error: 'Campaign name is required.' }, { status: 400 });
    if (!subject?.trim())
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    if (!templateBody?.trim())
      return NextResponse.json({ error: 'Body is required.' }, { status: 400 });
    if (typeof delay_days !== 'number' || delay_days < 0)
      return NextResponse.json({ error: 'delay_days must be a non-negative number.' }, { status: 400 });

    const campaign = await upsertCampaign(
      step,
      { name, subject, body: templateBody, delay_days, is_active: is_active ?? true },
      userId,
    );
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save campaign.' }, { status: 400 });
  }
}
