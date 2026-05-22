import { NextRequest, NextResponse } from 'next/server';
import { deleteTemplate } from '../../../../../lib/email-db';
import { getUserFromRequest } from '../../../../../lib/get-user';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const { id } = await params;
  try {
    await deleteTemplate(id, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to delete template.' }, { status: 400 });
  }
}
