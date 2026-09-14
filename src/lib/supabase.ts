import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// createClient throws synchronously on an empty or non-URL string, which would crash
// the whole app at import time (this module loads eagerly via page imports, not just
// when a Supabase-backed feature actually runs). Fall back to a syntactically valid
// placeholder so the app boots; real calls then fail gracefully with a normal { error }.
const isConfigured = supabaseUrl.startsWith('http') && supabaseAnonKey.length > 0;

if (!isConfigured) {
  console.warn('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder-anon-key'
);
