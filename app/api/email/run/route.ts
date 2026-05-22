import { NextRequest, NextResponse } from 'next/server';
import { runSequencer } from '../../../../lib/sequencer';
import { getUserFromRequest } from '../../../../lib/get-user';

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const result = await runSequencer(userId);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Sequencer failed.' }, { status: 400 });
  }
}
