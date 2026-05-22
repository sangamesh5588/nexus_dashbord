/**
 * Business email validator
 *
 * Rejects:
 *  - Personal / free email providers (Gmail, Yahoo, Hotmail, etc.)
 *  - Disposable / temp-mail addresses
 *  - Malformed email addresses
 *
 * Accepts only emails with a company-owned domain.
 */

// ── Free / personal / disposable domain blocklist ────────────────────────────
const FREE_DOMAINS = new Set([
  // Google
  'gmail.com', 'googlemail.com',

  // Yahoo (global + regional)
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.co.au', 'yahoo.co.nz',
  'yahoo.co.za', 'yahoo.co.jp', 'yahoo.ca', 'yahoo.fr', 'yahoo.de',
  'yahoo.es', 'yahoo.it', 'yahoo.gr', 'yahoo.com.au', 'yahoo.com.ar',
  'yahoo.com.br', 'yahoo.com.mx', 'yahoo.com.ph', 'yahoo.com.sg',
  'yahoo.com.hk', 'yahoo.ie', 'yahoo.se', 'yahoo.dk', 'yahoo.no',
  'yahoo.fi', 'yahoo.be', 'yahoo.at', 'yahoo.ro', 'yahoo.hu',
  'ymail.com', 'rocketmail.com',

  // Microsoft
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.es',
  'hotmail.it', 'hotmail.nl', 'hotmail.be', 'hotmail.se', 'hotmail.no',
  'hotmail.dk', 'hotmail.fi', 'hotmail.com.br', 'hotmail.com.ar',
  'hotmail.com.mx', 'hotmail.gr', 'hotmail.ro', 'hotmail.hu',
  'outlook.com', 'outlook.co.uk', 'outlook.fr', 'outlook.de', 'outlook.es',
  'outlook.it', 'outlook.nl', 'outlook.be', 'outlook.se', 'outlook.com.br',
  'outlook.com.ar', 'outlook.in', 'outlook.sa', 'outlook.ae',
  'live.com', 'live.co.uk', 'live.fr', 'live.de', 'live.es', 'live.it',
  'live.nl', 'live.be', 'live.se', 'live.no', 'live.dk', 'live.fi',
  'live.com.au', 'live.com.mx', 'live.com.ar', 'live.com.br', 'live.in',
  'msn.com', 'windowslive.com',

  // Apple
  'icloud.com', 'me.com', 'mac.com',

  // AOL / Verizon Media
  'aol.com', 'aol.co.uk', 'aim.com', 'verizon.net',

  // Privacy-first / encrypted
  'protonmail.com', 'protonmail.ch', 'proton.me', 'pm.me',
  'tutanota.com', 'tutanota.de', 'tutamail.com', 'tuta.com', 'keemail.me',
  'hushmail.com', 'hush.com', 'hush.ai', 'nym.hush.com',
  'mailfence.com', 'disroot.org', 'cock.li', 'airmail.cc', 'fastmail.fm',

  // Misc popular free providers
  'mail.com', 'email.com', 'inbox.com', 'usa.com', 'post.com', 'consultant.com',
  'dr.com', 'engineer.com', 'accountant.com', 'null.net', 'cheerful.com',
  'gmx.com', 'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch', 'gmx.co.uk',
  'gmx.fr', 'gmx.es', 'gmx.it', 'gmx.info',
  'web.de', 't-online.de', 'freenet.de', 'arcor.de', '1und1.de',
  'libero.it', 'virgilio.it', 'alice.it', 'tim.it', 'tiscali.it',
  'wanadoo.fr', 'orange.fr', 'sfr.fr', 'free.fr', 'laposte.net', 'bbox.fr',
  'rediffmail.com', 'indiatimes.com', 'sify.com',
  'naver.com', 'nate.com', 'daum.net', 'hanmail.net',
  'qq.com', '163.com', '126.com', 'sina.com', 'sina.cn', '21cn.com',
  'sohu.com', 'foxmail.com', 'vip.qq.com', '139.com', '189.cn',
  'att.net', 'comcast.net', 'cox.net', 'charter.net', 'sbcglobal.net',
  'bellsouth.net', 'earthlink.net', 'juno.com', 'excite.com', 'lycos.com',
  'mail.ru', 'list.ru', 'bk.ru', 'inbox.ru', 'yandex.com', 'yandex.ru',
  'yandex.ua', 'yandex.kz', 'yandex.by', 'rambler.ru',
  'terra.com.br', 'bol.com.br', 'ig.com.br', 'uol.com.br',
  'bigpond.com', 'bigpond.net.au', 'optusnet.com.au', 'internode.on.net',

  // Disposable / temp-mail services
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamail.biz', 'guerrillamail.de', 'grr.la', 'sharklasers.com',
  'guerrillamailblock.com', 'spam4.me', 'trashmail.com', 'trashmail.me',
  'trashmail.net', 'trashmail.org', 'trashmail.at', 'trashmail.io',
  'tempmail.com', 'tempmail.net', 'temp-mail.org', 'temp-mail.io',
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemail.co.uk',
  'throwam.com', 'throwaway.email', 'maildrop.cc', 'yopmail.com',
  'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc',
  'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf',
  'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf',
  'dispostable.com', 'discardmail.com', 'discardmail.de', 'spamgourmet.com',
  'mailnull.com', 'spam.la', 'spamspot.com', 'spamthisplease.com',
  'fakeinbox.com', 'mailnesia.com', 'mailnull.com', 'spamgourmet.com',
  'getairmail.com', 'filzmail.com', 'zetmail.com', 'jetable.org',
  'jetable.net', 'jetable.com', 'nospamfor.us', 'owlpic.com',
  'binkmail.com', 'bobmail.info', 'chammy.info', 'devnullmail.com',
  'letthemeatspam.com', 'soodonims.com', 'spamhereplease.com',
  'thankyou2010.com', 'thisisnotmyrealemail.com', 'tradermail.info',
]);

// ── File-extension TLDs that are NEVER real email domains ────────────────────
// e.g. "flags@2x.png" gets scraped from image filenames
const FILE_EXT_TLDS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp', 'tiff', 'tif',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'rar', 'tar', 'gz', '7z',
  'js', 'ts', 'css', 'html', 'htm', 'php', 'asp', 'aspx',
  'json', 'xml', 'csv', 'txt', 'md',
  'mp3', 'mp4', 'avi', 'mov', 'wav', 'webm',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'map', 'min', 'bundle',
]);

// ── Validator ─────────────────────────────────────────────────────────────────

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Returns `{ valid: true }` for business emails.
 * Returns `{ valid: false, reason }` for personal, disposable, or malformed emails.
 */
export function validateBusinessEmail(email: string): ValidationResult {
  const trimmed = email.trim().toLowerCase();

  // 1. Basic format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return { valid: false, reason: 'invalid format' };
  }

  // 2. Extract domain and TLD
  const atIdx = trimmed.lastIndexOf('@');
  const domain = trimmed.slice(atIdx + 1);
  const tld = domain.split('.').pop() ?? '';

  // 3. File-extension TLD check (catches "flags@2x.png", "img@hero.jpg", etc.)
  if (FILE_EXT_TLDS.has(tld)) {
    return { valid: false, reason: `not a real email address (.${tld} is a file extension)` };
  }

  // 4. Blocklist check (personal / free providers)
  if (FREE_DOMAINS.has(domain)) {
    return { valid: false, reason: `personal/free address (${domain})` };
  }

  // 4. Role-address patterns that are rarely a real contact
  const local = trimmed.slice(0, atIdx);
  const ROLE_PREFIXES = ['noreply', 'no-reply', 'donotreply', 'do-not-reply',
    'mailer-daemon', 'postmaster', 'webmaster', 'support', 'abuse', 'spam'];
  if (ROLE_PREFIXES.some((p) => local === p || local.startsWith(p + '.') || local.startsWith(p + '+') || local.startsWith(p + '_'))) {
    return { valid: false, reason: `role address (${local})` };
  }

  return { valid: true };
}

/**
 * Convenience: returns true only for business-grade emails.
 */
export function isBusinessEmail(email: string): boolean {
  return validateBusinessEmail(email).valid;
}
