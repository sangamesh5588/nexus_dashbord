import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, upsertTemplate, seedDefaultTemplates } from '../../../../lib/email-db';
import { getUserFromRequest } from '../../../../lib/get-user';

export async function GET(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    await seedDefaultTemplates(userId);
    const templates = await getTemplates(userId);
    return NextResponse.json({ templates });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch templates.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const body = await request.json() as {
      id?: string; name: string; step: number; subject: string; body: string;
      image_url?: string | null; image_name?: string | null;
    };
    const { id, name, step, subject, body: templateBody, image_url, image_name } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    if (![1, 2, 3].includes(step)) return NextResponse.json({ error: 'Step must be 1, 2, or 3.' }, { status: 400 });
    if (!subject?.trim()) return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    if (!templateBody?.trim()) return NextResponse.json({ error: 'Body is required.' }, { status: 400 });

    const template = await upsertTemplate(
      { id, name, step: step as 1 | 2 | 3, subject, body: templateBody, image_url: image_url ?? null, image_name: image_name ?? null },
      userId,
    );
    return NextResponse.json({ template }, { status: id ? 200 : 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to save template.' }, { status: 400 });
  }
}
