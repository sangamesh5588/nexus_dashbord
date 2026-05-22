import { callAI } from './ai-provider';
import { searchBusinesses, enrichWithDetails, PlaceResult, LocationPin } from './places-api';
import { extractEmailAndFounder, searchWebForEmail } from './email-extractor';
import { upsertLeads, getSettings, getExistingEmails } from './email-db';
import type { ParsedLead, EmailSettings } from '../types/email';

export type GeneratorProgress =
  | { type: 'status'; message: string }
  | { type: 'found'; business: string; email: string | null; saved: boolean; duplicate: boolean; hasWebsite: boolean; phone: string | null; contactType: 'email' | 'phone' }
  | { type: 'done'; saved: number; skipped: number; duplicates: number; errors: string[] }
  | { type: 'error'; message: string };

export type GeneratorOptions = {
  niche: string;
  city: string;
  country: string;
  area?: string;
  maxLeads: number;
  userId: string;
  websiteFilter?: 'all' | 'no_website' | 'has_website';
  locationPin?: LocationPin & { locationName?: string };
  onProgress: (event: GeneratorProgress) => void;
};

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.details === 'string') return obj.details;
    try { return JSON.stringify(err); } catch { /* ignore */ }
  }
  return String(err);
}

async function generateCustomNote(
  settings: EmailSettings,
  business: PlaceResult,
  cityName: string,
  niche: string,
  persona: string,
): Promise<string> {
  const websiteStatus = business.website
    ? `Has website: ${business.website}`
    : 'No website found';

  const system = `You write short, specific, personalised cold outreach notes for businesses.
Your service: ${persona || 'web design and development studio'}.
Write 1-2 sentences MAX about why this specific business needs your service.
Be concrete — mention their name, their niche, and their digital gap.
No generic statements. No fluff. No greeting.`;

  const user = `Business: ${business.name}
Location: ${cityName} ${business.address}
Industry: ${niche}
Reviews: ${business.rating}★ across ${business.reviewCount} reviews
Website status: ${websiteStatus}

Write the personalised pain-point note:`;

  return callAI(system, user, settings, 150);
}

export async function generateLeads(options: GeneratorOptions): Promise<void> {
  const { niche, city, country, area, maxLeads, userId, onProgress, websiteFilter = 'all', locationPin } = options;
  // In map-pin mode use the geocoded name as the display city
  const displayCity = locationPin?.locationName ?? (area?.trim() ? `${area.trim()}, ${city}` : city);
  const send = (event: GeneratorProgress) => onProgress(event);

  try {
    // Load settings for persona
    let persona = '';
    try {
      const settings = await getSettings(userId);
      persona = settings.ai_persona_bio ?? '';
    } catch { /* settings not required */ }

    // Load existing emails to prevent duplicates
    let existingEmails = new Set<string>();
    try {
      existingEmails = await getExistingEmails(userId);
      send({ type: 'status', message: `Loaded ${existingEmails.size} existing leads — duplicates will be skipped.` });
    } catch { /* non-fatal */ }

    const batch = new Date().toISOString().split('T')[0];
    const errors: string[] = [];
    let saved = 0;
    let skipped = 0;
    let duplicates = 0;

    // Build precise search query (area narrows to a district/zone)
    const locationStr = area?.trim()
      ? `${area.trim()}, ${city}, ${country}`
      : `${city}, ${country}`;

    send({ type: 'status', message: `Searching Google Places for "${niche}" in ${locationStr}…` });

    const rawPlaces = await searchBusinesses(niche, city, country, maxLeads, area?.trim(), locationPin);
    send({ type: 'status', message: `Found ${rawPlaces.length} businesses. Fetching details…` });

    const places = await enrichWithDetails(rawPlaces);
    send({ type: 'status', message: `Processing ${places.length} businesses — extracting emails and saving…` });

    for (const place of places) {
      try {
        const hasWebsite = !!place.website;

        // Apply website filter — silently skip non-matching businesses
        if (websiteFilter === 'has_website' && !hasWebsite) { skipped++; continue; }
        if (websiteFilter === 'no_website' && hasWebsite)  { skipped++; continue; }

        // ── No-website business: search web for email, fall back to phone lead ──
        if (!hasWebsite) {
          send({ type: 'status', message: `No website — searching web for ${place.name}'s email…` });

          // Try to find their email via web search (directories, Facebook, etc.)
          const webEmail = await searchWebForEmail(place.name, city);
          const contactEmail = webEmail?.toLowerCase().trim() ?? null;

          // Determine the key used to track this lead in the DB
          const dbEmail = contactEmail ?? `nolead.${place.placeId.toLowerCase()}@nexus.local`;
          const contactType: 'email' | 'phone' = contactEmail ? 'email' : 'phone';

          if (existingEmails.has(dbEmail)) {
            send({ type: 'found', business: place.name, email: contactEmail ?? place.phone, saved: false, duplicate: true, hasWebsite: false, phone: place.phone, contactType });
            duplicates++;
            continue;
          }

          const phoneNote = place.phone ? `📞 Phone: ${place.phone}` : '📞 No phone listed';
          const websiteNote = 'No website — prime prospect for web/digital services.';
          let customNote = `${phoneNote} — ${websiteNote}\n${place.rating}★ (${place.reviewCount} reviews)`;
          try {
            const settings = await getSettings(userId);
            const aiNote = await generateCustomNote(settings, place, displayCity, niche, persona);
            customNote = contactEmail
              ? aiNote
              : `${phoneNote}\n${aiNote}`;
          } catch { /* fall back */ }

          const lead: ParsedLead = {
            email: dbEmail,
            name: undefined,
            company: place.name,
            custom_note: customNote,
          };

          let leadSaved = false;
          try {
            await upsertLeads([lead], batch, userId);
            existingEmails.add(dbEmail);
            saved++;
            leadSaved = true;
          } catch (saveErr) {
            errors.push(`${place.name}: save failed — ${extractErrorMessage(saveErr)}`);
            console.error('[lead-generator] upsertLeads error:', saveErr);
          }

          // Display email if found via web, otherwise show phone
          const displayContact = contactEmail ?? place.phone;
          send({ type: 'found', business: place.name, email: displayContact, saved: leadSaved, duplicate: false, hasWebsite: false, phone: place.phone, contactType });
          continue;
        }

        // ── Website business: extract email ──────────────────────────────────
        const extracted = await extractEmailAndFounder(place.website!);
        const email = extracted.email;
        const founderName = extracted.founderName;

        if (!email) {
          send({ type: 'found', business: place.name, email: null, saved: false, duplicate: false, hasWebsite: true, phone: place.phone, contactType: 'email' });
          skipped++;
          continue;
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (existingEmails.has(normalizedEmail)) {
          send({ type: 'found', business: place.name, email, saved: false, duplicate: true, hasWebsite: true, phone: place.phone, contactType: 'email' });
          duplicates++;
          continue;
        }

        let customNote = `${place.rating}★ across ${place.reviewCount} reviews — website: ${place.website}.`;
        try {
          const settings = await getSettings(userId);
          customNote = await generateCustomNote(settings, place, displayCity, niche, persona);
        } catch { /* fall back to default note if AI not configured */ }

        const lead: ParsedLead = {
          email: normalizedEmail,
          name: founderName ?? undefined,
          company: place.name,
          custom_note: customNote,
        };

        let leadSaved = false;
        try {
          await upsertLeads([lead], batch, userId);
          existingEmails.add(normalizedEmail);
          saved++;
          leadSaved = true;
        } catch (saveErr) {
          errors.push(`${place.name}: save failed — ${extractErrorMessage(saveErr)}`);
          console.error('[lead-generator] upsertLeads error:', saveErr);
        }

        send({ type: 'found', business: place.name, email, saved: leadSaved, duplicate: false, hasWebsite: true, phone: place.phone, contactType: 'email' });

      } catch (err) {
        const msg = `${place.name}: ${extractErrorMessage(err)}`;
        errors.push(msg);
        skipped++;
        console.error('[lead-generator] per-business error:', err);
      }
    }

    send({ type: 'done', saved, skipped, duplicates, errors });
  } catch (err) {
    const message = extractErrorMessage(err);
    console.error('[lead-generator] fatal error:', err);
    send({ type: 'error', message });
  }
}
