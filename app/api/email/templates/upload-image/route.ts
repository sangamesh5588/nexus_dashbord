import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '../../../../../lib/email-db';
import { getUserFromRequest } from '../../../../../lib/get-user';

const BUCKET = 'template-images';
const MAX_SIZE_MB = 5;

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) return NextResponse.json({ error: 'No image provided.' }, { status: 400 });

    // Size guard
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Image must be under ${MAX_SIZE_MB} MB.` }, { status: 400 });
    }

    // Type guard
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 });
    }

    const db = getAdminClient();
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl, name: file.name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed.' },
      { status: 500 },
    );
  }
}
