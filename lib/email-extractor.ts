import axios from 'axios';

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const IGNORE_PATTERNS = [
  '@example', '@yourdomain', '@domain.com', '@email.com',
  '@sentry', '@wix', '@wordpress', '@jquery', '@schema',
  'noreply@', 'no-reply@', 'donotreply@', 'mailer@', 'bounce@',
];

// File extensions that must never appear as the TLD of a scraped email
const FAKE_EMAIL_TLDS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar',
  'js', 'ts', 'css', 'html', 'htm', 'php', 'json', 'xml',
  'mp3', 'mp4', 'mov', 'avi', 'woff', 'woff2', 'ttf', 'map',
]);

// Founder/owner title keywords
const TITLE_KEYWORDS = [
  'Founder', 'Co-Founder', 'Co Founder', 'CEO', 'Chief Executive',
  'Owner', 'Managing Director', 'MD', 'Managing Partner', 'Director',
  'President', 'Principal',
];

function cleanUrl(base: string, path: string): string {
  try { return new URL(path, base).href; }
  catch { return `${base.replace(/\/$/, '')}${path}`; }
}

function extractEmails(html: string, domain: string): string[] {
  const matches = html.match(EMAIL_REGEX) ?? [];
  return [...new Set(matches)].filter((email) => {
    const lower = email.toLowerCase();
    if (IGNORE_PATTERNS.some((p) => lower.includes(p))) return false;
    if (email.length > 80) return false;
    const emailDomain = lower.split('@')[1];
    if (!emailDomain) return false;
    // Reject emails whose TLD is a file extension (e.g. flags@2x.png)
    const tld = emailDomain.split('.').pop() ?? '';
    if (FAKE_EMAIL_TLDS.has(tld)) return false;
    return true;
  });
}

/**
 * Try to extract the founder / owner first name + last name from HTML.
 * Looks for patterns like "Jane Smith, Founder" or "CEO: John Doe".
 * Returns the best candidate name, or null.
 */
export function extractFounderName(html: string): string | null {
  // Strip tags for cleaner matching
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // Pattern 1: "FirstName LastName, Title"
  const pattern1 = new RegExp(
    `([A-Z][a-z]+(?: [A-Z][a-z]+)+)[,\\s]+(?:${TITLE_KEYWORDS.join('|')})`,
    'g',
  );
  // Pattern 2: "Title: FirstName LastName" or "Title — FirstName LastName"
  const pattern2 = new RegExp(
    `(?:${TITLE_KEYWORDS.join('|')})[:\\s—–-]+([A-Z][a-z]+(?: [A-Z][a-z]+)+)`,
    'g',
  );
  // Pattern 3: "I'm FirstName LastName" / "I am FirstName LastName"
  const pattern3 = /I(?:'m| am) ([A-Z][a-z]+(?: [A-Z][a-z]+)+)/g;

  for (const pattern of [pattern1, pattern2, pattern3]) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      const name = match[1].trim();
      // Sanity: 2-4 words, no very long tokens
      const words = name.split(' ');
      if (words.length >= 2 && words.length <= 4 && words.every((w) => w.length <= 20)) {
        return name;
      }
    }
  }
  return null;
}

function domainFromUrl(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function guessDomainEmails(website: string): string[] {
  const domain = domainFromUrl(website);
  if (!domain) return [];
  return [`info@${domain}`, `contact@${domain}`];
}

async function fetchHtml(url: string): Promise<string> {
  const res = await axios.get<string>(url, {
    timeout: 6000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; business-directory-bot/1.0)',
      Accept: 'text/html',
    },
    maxRedirects: 3,
  });
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
}

export type ExtractResult = {
  email: string | null;
  founderName: string | null;
};

/**
 * Scrape the website for a contact email AND try to find the founder/owner name.
 */
export async function extractEmailAndFounder(website: string): Promise<ExtractResult> {
  if (!website) return { email: null, founderName: null };

  const domain = domainFromUrl(website);
  const pagesToTry = [
    website,
    cleanUrl(website, '/contact'),
    cleanUrl(website, '/contact-us'),
    cleanUrl(website, '/about'),
    cleanUrl(website, '/about-us'),
    cleanUrl(website, '/team'),
    cleanUrl(website, '/our-team'),
  ];

  let bestEmail: string | null = null;
  let bestFounder: string | null = null;

  for (const page of pagesToTry) {
    try {
      const html = await fetchHtml(page);
      const emails = extractEmails(html, domain);

      // Pick email (domain match preferred)
      if (!bestEmail) {
        const domainMatch = emails.find((e) => e.endsWith(`@${domain}`));
        bestEmail = domainMatch ?? emails[0] ?? null;
      }

      // Try to find founder name on About/Team pages
      if (!bestFounder) {
        bestFounder = extractFounderName(html);
      }

      // Stop early once we have both
      if (bestEmail && bestFounder) break;
    } catch {
      // page unreachable — try next
    }
  }

  // Fall back to guessed email if nothing found
  if (!bestEmail) {
    bestEmail = guessDomainEmails(website)[0] ?? null;
  }

  return { email: bestEmail, founderName: bestFounder };
}

/** Backward-compatible wrapper — returns email only */
export async function extractEmailFromWebsite(website: string): Promise<string | null> {
  const { email } = await extractEmailAndFounder(website);
  return email;
}

// Domains to skip when visiting search result links
const SKIP_LINK_DOMAINS = [
  'google.', 'duckduckgo.', 'bing.', 'yahoo.',
  'facebook.', 'instagram.', 'twitter.', 'x.com',
  'youtube.', 'linkedin.', 'wikipedia.',
  'apple.com', 'maps.apple.',
];

/**
 * Search DuckDuckGo for a business's email address.
 * Used as a fallback for businesses with no website.
 * Checks result snippets first, then visits the top result pages.
 */
export async function searchWebForEmail(
  businessName: string,
  city: string,
): Promise<string | null> {
  const query = encodeURIComponent(`"${businessName}" ${city} contact email`);
  try {
    const html = await fetchHtml(`https://html.duckduckgo.com/html/?q=${query}`);

    // 1. Check result snippets directly — many directories show email in the preview
    const snippetEmails = extractEmails(html, '').filter(
      (e) => !e.includes('duckduckgo') && !e.includes('duck.com'),
    );
    if (snippetEmails[0]) return snippetEmails[0];

    // 2. Pull the top result URLs that are worth visiting
    const resultLinks = [...html.matchAll(/href="(https?:\/\/[^"&]+)"/g)]
      .map((m) => m[1])
      .filter((url) => !SKIP_LINK_DOMAINS.some((d) => url.includes(d)))
      .slice(0, 3);

    // 3. Visit each result page and look for email
    for (const link of resultLinks) {
      try {
        const pageHtml = await fetchHtml(link);
        const domain = domainFromUrl(link);
        const emails = extractEmails(pageHtml, domain);
        if (emails[0]) return emails[0];
      } catch { /* unreachable page — try next */ }
    }
  } catch { /* search failed — non-fatal */ }

  return null;
}
