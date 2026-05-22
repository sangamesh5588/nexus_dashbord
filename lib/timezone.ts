/**
 * Smart timezone-based send-time logic.
 * Maps country names to UTC offsets and checks if it's a good time to send
 * (9am–6pm Mon–Fri in the recipient's local time).
 */

// Country → UTC offset (hours). Uses standard time (not DST) for simplicity.
const COUNTRY_UTC_OFFSET: Record<string, number> = {
  // Middle East
  'uae': 4, 'united arab emirates': 4,
  'saudi arabia': 3, 'ksa': 3,
  'qatar': 3,
  'kuwait': 3,
  'bahrain': 3,
  'oman': 4,
  'jordan': 2,
  'lebanon': 2,
  'israel': 2,
  'iraq': 3,
  'iran': 3.5,
  'yemen': 3,

  // Asia
  'india': 5.5,
  'pakistan': 5,
  'bangladesh': 6,
  'sri lanka': 5.5,
  'nepal': 5.75,
  'china': 8,
  'japan': 9,
  'south korea': 9,
  'singapore': 8,
  'malaysia': 8,
  'indonesia': 7,
  'thailand': 7,
  'vietnam': 7,
  'philippines': 8,
  'hong kong': 8,
  'taiwan': 8,
  'myanmar': 6.5,
  'cambodia': 7,

  // Europe
  'uk': 0, 'united kingdom': 0, 'great britain': 0,
  'germany': 1,
  'france': 1,
  'spain': 1,
  'italy': 1,
  'netherlands': 1,
  'belgium': 1,
  'switzerland': 1,
  'austria': 1,
  'poland': 1,
  'sweden': 1,
  'norway': 1,
  'denmark': 1,
  'finland': 2,
  'portugal': 0,
  'greece': 2,
  'turkey': 3,
  'russia': 3,

  // Americas
  'usa': -5, 'united states': -5, 'us': -5,  // EST (most business)
  'canada': -5,
  'mexico': -6,
  'brazil': -3,
  'argentina': -3,
  'colombia': -5,
  'chile': -4,
  'peru': -5,

  // Oceania
  'australia': 10, // AEST
  'new zealand': 12,

  // Africa
  'south africa': 2,
  'egypt': 2,
  'nigeria': 1,
  'kenya': 3,
  'ghana': 0,
  'ethiopia': 3,
  'morocco': 1,
  'tunisia': 1,
  'algeria': 1,
};

/**
 * Extract country from a "company" field like:
 * "Downtown Dubai, Dubai, UAE"  → "uae"
 * "Dubai, UAE"                  → "uae"
 * "Mumbai, India"               → "india"
 */
export function extractCountryFromCompany(company: string | null): string | null {
  if (!company) return null;
  const parts = company.split(',').map((p) => p.trim());
  const last = parts[parts.length - 1]?.toLowerCase();
  return last || null;
}

/**
 * Get the UTC offset hours for a country name.
 * Returns null if unknown.
 */
export function getUtcOffset(country: string): number | null {
  return COUNTRY_UTC_OFFSET[country.toLowerCase()] ?? null;
}

/**
 * Returns true if the current UTC time falls within business hours
 * (9:00am – 6:00pm, Monday – Friday) in the target country's timezone.
 *
 * If country is unknown, returns true (don't block — send anyway).
 */
export function isGoodTimeToSend(country: string | null): boolean {
  if (!country) return true;

  const offset = getUtcOffset(country);
  if (offset === null) return true; // Unknown country — don't block

  const nowUtc = new Date();
  const localHour = nowUtc.getUTCHours() + offset;
  const localMinutes = nowUtc.getUTCMinutes();
  const localDayOfWeek = ((nowUtc.getUTCDay() + Math.floor((nowUtc.getUTCHours() + offset) / 24)) + 7) % 7;

  // Mon–Fri only (1–5)
  if (localDayOfWeek === 0 || localDayOfWeek === 6) return false;

  // 9:00am – 6:00pm
  const hourDecimal = localHour + localMinutes / 60;
  return hourDecimal >= 9 && hourDecimal < 18;
}

/**
 * Get a human-readable current local time for a country.
 * e.g. "10:30 AM GST" for UAE
 */
export function getLocalTimeString(country: string): string {
  const offset = getUtcOffset(country);
  if (offset === null) return 'Unknown timezone';

  const nowUtc = new Date();
  const localMs = nowUtc.getTime() + offset * 3600 * 1000;
  const local = new Date(localMs);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
