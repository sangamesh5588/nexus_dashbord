// Run with: npx tsx scripts/import-dubai-leads.ts
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const leads = [
  // ── TOP 20 ──────────────────────────────────────────────────────
  { email: 'info@districtuae.com',          name: 'District Real Estate',          company: 'Business Bay',     custom_note: 'Domain shows a blank Plesk hosting placeholder — main site is DOWN. Agency operating on 4.8★ reputation but losing every digital lead.' },
  { email: 'info@aalmar.ae',                name: 'Aalmar Real Estate',             company: 'Deira',            custom_note: 'No website found in Google. 5★ rating but invisible online. Pure WhatsApp/walk-in operation.' },
  { email: 'info@fmhrealestate.ae',         name: 'FMH Real Estate',               company: 'Deira',            custom_note: 'No professional website. Small Deira operator with 5★ reviews — easiest sell.' },
  { email: 'info@alayan.ae',                name: 'Al Ayan Real Estate',            company: 'International City', custom_note: '1041 reviews and no proper site = bleeding leads.' },
  { email: 'info@trianglecity.ae',          name: 'Triangle City Real Estate',      company: 'International City', custom_note: 'Brand new agency, no site yet. Perfect timing — you become their first digital partner.' },
  { email: 'info@alamman.ae',               name: 'Al Amman Properties',            company: 'International City', custom_note: '172 reviews at 4.9★ — strong reputation, zero web presence to capitalize on.' },
  { email: 'info@alphaoasis.ae',            name: 'Alpha Oasis Real Estate',        company: 'Silicon Oasis',    custom_note: 'No discoverable website. Small DSO agency with good reviews — easy first sale.' },
  { email: 'info@stardomrealestate.ae',     name: 'Stardom Real Estate Brokers',    company: 'Silicon Oasis',    custom_note: '5★ across 38 reviews, no proper site. CEO Syed Azmath Hussain is the decision-maker.' },
  { email: 'info@auricacres.ae',            name: 'Auric Acres Real Estate',        company: 'Bur Dubai',        custom_note: 'No discoverable site, focused on India NRI buyers. Specific niche = specific website pitch.' },
  { email: 'info@vihaan.ae',                name: 'Vihaan Real Estate',             company: 'Bur Dubai',        custom_note: '5★ rating, mortgage broker focus, no website. NRI-focused agency — opportunity for bilingual site.' },
  { email: 'info@smartfolks.ae',            name: 'Smart Folks Real Estate',        company: 'Bur Dubai',        custom_note: '18-year veteran agency, listed on Dubizzle but no proprietary website. Owner Imran ul Haq.' },
  { email: 'info@magusrealestate.com',      name: 'Magus Real Estate Brokers',      company: 'Downtown Dubai',   custom_note: 'Basic site exists but no lead capture, no IDX/Bayut feed integration. Looks like 2018-era WordPress.' },
  { email: 'info@therealtordubai.com',      name: 'TheRealtorDubai Brokerage',      company: 'Business Bay',     custom_note: 'Has a site, but slow loading, no Arabic version, no mortgage calculator. Easy upsell.' },
  { email: 'info@skyaims.ae',               name: 'Sky Aims Real Estate',           company: 'Deira',            custom_note: '5★ rating, 116 reviews — strong brand with no web home. Walk-in heavy traffic in Deira.' },
  { email: 'info@tribecadubai.com',         name: 'Tribeca Real Estate',            company: 'Downtown Dubai',   custom_note: 'Site exists but no proper agent profiles, no IDX, no booking system for viewings. Premium location deserves premium site.' },
  { email: 'info@countryhomere.ae',         name: 'Country Home Real Estate',       company: 'JLT',              custom_note: 'No proper website. 5★ agency with strong word-of-mouth — needs digital amplification.' },
  { email: 'info@topazworld.ae',            name: 'Topaz World Real Estate',        company: 'JLT',              custom_note: 'New agency, perfect timing. No site = no competition for the build.' },
  { email: 'info@goldenvalue.ae',           name: 'Golden Value Real Estate',       company: 'JLT',              custom_note: 'Small JLT operator, no professional site. Easy pitch with India-NRI angle.' },
  { email: 'info@houzon.com',               name: 'Houzon Real Estate',             company: 'Business Bay',     custom_note: 'Has a site (houzon.com) but it\'s a template-based WordPress with weak property search UX. Could 2x their lead capture.' },
  { email: 'info@phoenixhomes.ae',          name: 'Phoenix Homes Real Estate',      company: 'Barsha Heights',   custom_note: 'Has a solid WordPress site but no Bayut/Dubizzle API sync, no mortgage calc, no agent CRM. Pitch enhancement not rebuild.' },

  // ── NEXT 30 (21-50) ─────────────────────────────────────────────
  { email: 'info@providentestate.com',      name: 'Provident Real Estate',          company: 'Dubai Marina',     custom_note: 'Has site but outdated UX, slow mobile load, no Arabic version, weak property filter system. 523 reviews deserves better digital storefront.' },
  { email: 'info@alhproperties.com',        name: 'ALH Properties',                 company: 'Dubai Marina',     custom_note: 'Standard real estate template site, no IDX feed integration, no agent-specific lead routing. Easy upgrade win.' },
  { email: 'info@exclusive-links.com',      name: 'Exclusive Links Real Estate',    company: 'Dubai Marina',     custom_note: 'Old desktop-first design, mobile experience poor. Marina premium clientele expects better.' },
  { email: 'info@wikihomes.ae',             name: 'Wikihomes Real Estate',          company: 'Business Bay',     custom_note: 'No website found. 153 reviews at 4.8★ — strong reputation invisible online.' },
  { email: 'info@unionsquarehouse.com',     name: 'Union Square House',             company: 'Business Bay',     custom_note: 'Has site but no mortgage calculator, no Arabic switch, slow property search. Easy 30% conversion upside.' },
  { email: 'info@elanrealestate.ae',        name: 'Elan Real Estate',               company: 'Business Bay',     custom_note: '4.9★ with 149 reviews, no proper website. Pure WhatsApp + Dubizzle operation.' },
  { email: 'info@skyviewre.com',            name: 'Sky View Real Estate',           company: 'Business Bay',     custom_note: 'Old WordPress template, no Bayut sync, weak SEO. 275 reviews deserves more traffic capture.' },
  { email: 'info@axisbrokerage.ae',         name: 'Axis Real Estate Brokerage',     company: 'Business Bay',     custom_note: '4.9★, 92 reviews, no discoverable site. Small team, fast decision-maker.' },
  { email: 'info@mbcrealestate.ae',         name: 'MBC Real Estate',                company: 'JLT',              custom_note: '36 reviews, no website. Small JLT agency, perfect for first-website pitch.' },
  { email: 'info@kingdombymag.ae',          name: 'Kingdom By MAG',                 company: 'JLT',              custom_note: 'MAG brand sub-agency, no standalone website. Brand recognition without digital lead capture.' },
  { email: 'info@indusre.com',              name: 'Indus Real Estate DMCC',         company: 'JLT',              custom_note: 'Has site but no property search, looks like a brochure not a lead engine. Focus on Indian NRI segment — perfect for bilingual upgrade.' },
  { email: 'info@fiduproperties.com',       name: 'FIDU Properties',                company: 'Downtown Dubai',   custom_note: 'Has site but property listing UX is clunky, no mortgage tools, mobile slow. Reviews mention poor follow-up — website automation could fix this.' },
  { email: 'info@silverkeys.ae',            name: 'Silver Keys Real Estate',        company: 'Deira',            custom_note: '4 years in business, no proper website. Small Deira operator — easy first sale.' },
  { email: 'info@hengameabedi.ae',          name: 'Hengameh Abedi Real Estate',     company: 'Deira',            custom_note: 'Property management + brokerage, no website. Hengameh personally runs it — direct decision-maker access.' },
  { email: 'info@elitepropertybrokerage.com', name: 'ELITE Property Brokerage',     company: 'Barsha Heights',   custom_note: 'Has site, decent design, but no IDX integration, no mortgage calculator. Premium brand deserves premium tools.' },
  { email: 'info@urbannestre.com',          name: 'The Urban Nest Real Estate',     company: 'Barsha Heights',   custom_note: '5★ rating, decent site, but no Arabic version, weak SEO. Needs neighborhood-specific landing pages.' },
  { email: 'info@alkhailre.ae',             name: 'Al Khail Real Estate',           company: 'Barsha Heights',   custom_note: '20 years experience, basic site. Says "transparent pricing" on Google reviews — perfect lead-magnet hook for new site.' },
  { email: 'info@homelandrealty.ae',        name: 'Homeland Realty',                company: 'Al Barsha',        custom_note: '4.9★ with 213 reviews, site exists but feels outdated. Yalda Massoudi is top agent — needs agent-profile pages.' },
  { email: 'info@mivarealestate.ae',        name: 'Miva Real Estate',               company: 'Al Barsha',        custom_note: '5★ across 36 reviews, no website. Small but fast-growing — first-website opportunity.' },
  { email: 'info@hsrealestate.ae',          name: 'H&S Real Estate',                company: 'Al Barsha',        custom_note: 'Has site but listing presentation weak, no IDX, no agent CRM. 308 reviews = strong base to amplify.' },
  { email: 'info@outlookproperties.com',    name: 'Outlook Properties',             company: 'Al Barsha',        custom_note: 'Has site but slow, no Arabic, no proper mortgage tool. Recent reviews mention digital experience gaps.' },
  { email: 'info@bluechiprealestate.ae',    name: 'Bluechip Real Estate',           company: 'Al Barsha',        custom_note: 'Site exists but template-based, no premium feel for a premium brand. 344 reviews deserves better digital storefront.' },
  { email: 'info@astonpearl.com',           name: 'Aston Pearl Real Estate',        company: 'Al Barsha',        custom_note: '428 reviews, site exists but UX dated, no proper IDX, mobile experience weak.' },
  { email: 'info@aaestate.ae',              name: 'A&A Real Estate LLC',            company: 'DIFC',             custom_note: 'DIFC premium location, only 11 reviews — small boutique. No website = perfect first-build target.' },
  { email: 'info@ahyanrealestate.com',      name: 'Ahyan Real Estate',              company: 'DIFC',             custom_note: 'Has site but some bad reviews mention trust issues — needs trust-building website with verified agent profiles + RERA badges.' },
  { email: 'info@loamrealestate.com',       name: 'Loam Real Estate',               company: 'Sheikh Zayed Rd',  custom_note: 'Has basic site, recent reviews mention poor receptionist — automated lead capture would fix gate-keeping issues.' },
  { email: 'marketing@bhomes.com',          name: 'Betterhomes Marina',             company: 'Dubai Marina',     custom_note: 'Established brand, decent site, but specific Marina branch lacks dedicated landing page. Pitch: branch-specific microsite for hyperlocal SEO.' },
  { email: 'info@drivenproperties.com',     name: 'Driven Properties HQ',           company: 'Downtown Dubai',   custom_note: 'Big brand with decent site, but 1414 reviews suggest huge traffic potential — pitch: AI chatbot + WhatsApp integration.' },
  { email: 'info@dandbdubai.com',           name: 'D&B Properties',                 company: 'Business Bay',     custom_note: '3510 reviews = enterprise-tier. Pitch is enhancement: build a sub-product like a "Property Investment Calculator" as a lead magnet.' },
];

async function importLeads() {
  console.log(`Importing ${leads.length} Dubai real estate leads...`);

  const records = leads.map((l) => ({
    email: l.email,
    name: l.name,
    company: l.company,
    custom_note: l.custom_note,
    status: 'active',
    upload_batch: 'dubai-real-estate-2026-05-21',
  }));

  const { error, data } = await supabase
    .from('leads')
    .upsert(records, { onConflict: 'email', ignoreDuplicates: false })
    .select();

  if (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully imported ${data?.length ?? leads.length} leads into Supabase.`);
  console.log('Batch tag: dubai-real-estate-2026-05-21');
}

importLeads();
