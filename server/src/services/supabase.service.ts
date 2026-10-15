import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim();
// Normalize .supabase.com typos to .supabase.co
const supabaseUrl = rawUrl ? rawUrl.replace(/\.supabase\.com\/?$/, '.supabase.co').replace(/\/+$/, '') : undefined;

const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY
)?.trim();

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project.supabase.co') &&
    !supabaseKey.includes('your-supabase-anon-key')
);

export const serverSupabase: SupabaseClient | null = isServerSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
