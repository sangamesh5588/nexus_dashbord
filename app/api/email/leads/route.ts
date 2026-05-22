import { NextRequest, NextResponse } from 'next/server';
import { parseLeadsFromBuffer } from '../../../../lib/excel-parser';
import { upsertLeads, getLeads, getLeadsByTab, getLeadTabCounts } from '../../../../lib/email-db';
import { getUserFromRequest } from '../../../../lib/get-user';
import type { LeadTab } from '../../../../types/email';

const VALID_TABS: LeadTab[] = ['all', 'step1', 'step2', 'step3', 'done', 'spam'];

export async function GET(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const tabParam = searchParams.get('tab') as LeadTab | null;
    const withCounts = searchParams.get('counts') === 'true';

    const tab: LeadTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'all';

    const [leads, counts] = await Promise.all([
      tab === 'all' && !tabParam ? getLeads(userId) : getLeadsByTab(tab, userId),
      withCounts ? getLeadTabCounts(userId) : Promise.resolve(null),
    ]);

    return NextResponse.json({ leads, counts });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch leads.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      return NextResponse.json({ error: 'Only .xlsx or .xls files are supported.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { leads, rejected } = parseLeadsFromBuffer(buffer);
    const batch = new Date().toISOString().split('T')[0];
    const count = await upsertLeads(leads, batch, userId);

    return NextResponse.json({
      count,
      batch,
      parsed: leads.length + rejected.length,
      saved: count,
      rejected: rejected.length,
      rejectedList: rejected.slice(0, 20),
    }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed.' }, { status: 400 });
  }
}
