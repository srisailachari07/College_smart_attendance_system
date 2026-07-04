/**
 * supabase-client.js — Supabase Client Singleton
 *
 * Creates and exports ONE Supabase client instance for the entire application.
 * Only api.js imports from this module — no other module should import supabase directly.
 *
 * Uses APP_CONFIG.SUPABASE_URL and APP_CONFIG.SUPABASE_ANON_KEY from config.js.
 * Service Role Key is NEVER used in the browser.
 */

// Supabase JS v2 is loaded via CDN in HTML files before this module loads
// The createClient function is available on the global window.supabase object

const { createClient } = window.supabase;

if (!APP_CONFIG || !APP_CONFIG.SUPABASE_URL || APP_CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
  console.warn(
    '[SmartAttend] Supabase URL not configured. ' +
    'Please update config.js with your Supabase project URL and anon key.'
  );
}

function getStorageKey() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes('/admin')) {
    return 'sb-admin-auth-token';
  } else if (path.includes('/faculty') || path.includes('/staff')) {
    return 'sb-faculty-auth-token';
  }
  return 'sb-default-auth-token';
}

export const supabaseClient = createClient(
  APP_CONFIG.SUPABASE_URL,
  APP_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: getStorageKey(),
    },
  }
);
