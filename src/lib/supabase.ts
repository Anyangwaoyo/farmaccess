import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const hasValidUrl =
  Boolean(supabaseUrl) &&
  !supabaseUrl!.includes('your-project-id') &&
  supabaseUrl!.startsWith('https://');

const hasValidKey =
  Boolean(supabaseAnonKey) &&
  !supabaseAnonKey!.includes('your-public-anon-key') &&
  supabaseAnonKey!.length > 20;

export const isSupabaseConfigured = hasValidUrl && hasValidKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
