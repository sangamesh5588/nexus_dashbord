import { NextRequest } from 'next/server';
import { generateLeads, GeneratorProgress } from '../../../../lib/lead-generator';
import { getUserFromRequest } from '../../../../lib/get-user';

export const maxDuration = 300; // 5 minutes — long-running SSE

export async function POST(request: NextRequest) {
  const userId = await getUserFromRequest(request);
  if (!userId) return Response.json({ error: 'Unauthorised.' }, { status: 401 });

  const body = await request.json() as {
    niche: string;
    city: string;
    country: string;
    area?: string;
    maxLeads: number;
    websiteFilter?: 'all' | 'no_website' | 'has_website';
    locationPin?: { lat: number; lng: number; radiusMeters: number; locationName?: string };
  };
  const { niche, city, country, area, maxLeads = 20, websiteFilter = 'all', locationPin } = body;

  if (!niche?.trim()) return Response.json({ error: 'Niche is required.' }, { status: 400 });
  // city & country are not required in map-pin mode (locationPin provides the location)
  if (!locationPin) {
    if (!city?.trim())    return Response.json({ error: 'City is required.' },    { status: 400 });
    if (!country?.trim()) return Response.json({ error: 'Country is required.' }, { status: 400 });
  }

  const capped = Math.min(Math.max(maxLeads, 1), 500);

  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const send = (event: GeneratorProgress) => {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    writer.write(encoder.encode(line)).catch(() => null);
  };

  generateLeads({ niche, city, country, area: area?.trim(), maxLeads: capped, userId, websiteFilter, locationPin, onProgress: send })
    .catch((err) => send({ type: 'error', message: err instanceof Error ? err.message : 'Failed.' }))
    .finally(() => writer.close().catch(() => null));

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
