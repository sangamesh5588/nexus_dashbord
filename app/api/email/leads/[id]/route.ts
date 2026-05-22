import { NextRequest, NextResponse } from 'next/server';
import { updateLeadStatus } from '../../../../../lib/email-db';
import { getUserFromRequest } from '../../../../../lib/get-user';
import type { Lead } from '../../../../../types/email';

const VALID_STATUSES: Lead['status'][] = ['active', 'replied', 'unsubscribed', 'spam'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Lead ID required.' }, { status: 400 });

  try {
    const body = await request.json() as { status?: Lead['status'] };
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    await updateLeadStatus(id, body.status, userId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    // Supabase PostgrestError has a message property but is not an Error instance
    const msg =
      err instanceof Error
        ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err)
          ? String((err as { message: unknown }).message)
          : JSON.stringify(err);
    console.error('[PATCH /api/email/leads/:id]', msg, err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
