import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-supabase-url') || supabaseAnonKey.includes('your-supabase-anon-key')) {
    // We throw a descriptive error that will be caught when the app tries to use Supabase
    throw new Error('Supabase configuration missing or invalid. Please set your actual VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Secrets panel.');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
};

// Export a proxy or a getter-based object to maintain a similar API if possible, 
// but it's safer to just use the function.
// For this app, we'll update the imports to use getSupabase().
