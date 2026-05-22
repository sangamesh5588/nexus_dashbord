import { createBrowserClient } from '@supabase/ssr';

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasValidUrl = configuredUrl?.startsWith('http://') || configuredUrl?.startsWith('https://');
const hasRealAnonKey = Boolean(configuredAnonKey && !configuredAnonKey.includes('your_'));

const supabaseUrl = hasValidUrl && configuredUrl ? configuredUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = hasRealAnonKey && configuredAnonKey ? configuredAnonKey : 'placeholder-anon-key';

// createBrowserClient stores the PKCE code verifier in cookies, not localStorage,
// so it survives the OAuth redirect in SSR frameworks like Next.js.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = hasValidUrl && hasRealAnonKey;
