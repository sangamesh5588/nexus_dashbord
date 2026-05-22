import axios from 'axios';

// Uses the new Places API (v1) — enabled by default on new GCP projects.
// Docs: https://developers.google.com/maps/documentation/places/web-service/op-overview
const BASE_V1 = 'https://places.googleapis.com/v1';

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  website: string | null;
  phone: string | null;
};

function getKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || key.includes('your_')) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured. Add it in .env.local.');
  }
  return key;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Text Search (new API) ────────────────────────────────────────────────────
export type LocationPin = {
  lat: number;
  lng: number;
  radiusMeters: number;
};

export async function searchBusinesses(
  niche: string,
  city: string,
  country: string,
  maxResults = 20,
  area?: string,
  locationPin?: LocationPin,
): Promise<PlaceResult[]> {
  const key = getKey();
  // Map pin mode: search by coordinates. Text mode: include location in query string.
  const textQuery = locationPin
    ? niche
    : `${niche} in ${area?.trim() ? `${area.trim()}, ${city}, ${country}` : `${city}, ${country}`}`;
  const results: PlaceResult[] = [];
  let pageToken: string | undefined;

  do {
    const body: Record<string, unknown> = {
      textQuery,
      maxResultCount: Math.min(20, maxResults - results.length),
      languageCode: 'en',
    };
    if (locationPin) {
      body.locationBias = {
        circle: {
          center: { latitude: locationPin.lat, longitude: locationPin.lng },
          radius: locationPin.radiusMeters,
        },
      };
    }
    if (pageToken) body.pageToken = pageToken;

    const res = await axios.post<{
      places?: Array<{
        id: string;
        displayName?: { text: string };
        formattedAddress?: string;
        rating?: number;
        userRatingCount?: number;
        websiteUri?: string;
        nationalPhoneNumber?: string;
      }>;
      nextPageToken?: string;
    }>(
      `${BASE_V1}/places:searchText`,
      body,
      {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,nextPageToken',
        },
        timeout: 15000,
      },
    );

    for (const place of res.data.places ?? []) {
      results.push({
        placeId: place.id,
        name: place.displayName?.text ?? '(no name)',
        address: place.formattedAddress ?? '',
        rating: place.rating ?? 0,
        reviewCount: place.userRatingCount ?? 0,
        website: place.websiteUri ?? null,
        phone: place.nationalPhoneNumber ?? null,
      });
      if (results.length >= maxResults) break;
    }

    pageToken = res.data.nextPageToken;
    if (pageToken) await sleep(500); // small pause before next page
  } while (pageToken && results.length < maxResults);

  return results;
}

// ─── Place Details (new API) — only needed if website wasn't in text-search ──
export async function enrichWithDetails(places: PlaceResult[]): Promise<PlaceResult[]> {
  const key = getKey();
  const enriched: PlaceResult[] = [];

  for (const place of places) {
    // If we already got website from text search, no need to call details
    if (place.website !== null) {
      enriched.push(place);
      await sleep(50);
      continue;
    }

    try {
      const res = await axios.get<{
        websiteUri?: string;
        nationalPhoneNumber?: string;
      }>(
        `${BASE_V1}/places/${place.placeId}`,
        {
          headers: {
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask': 'websiteUri,nationalPhoneNumber',
          },
          timeout: 8000,
        },
      );

      enriched.push({
        ...place,
        website: res.data.websiteUri ?? null,
        phone: res.data.nationalPhoneNumber ?? place.phone,
      });
    } catch {
      enriched.push(place);
    }
    await sleep(100);
  }

  return enriched;
}
