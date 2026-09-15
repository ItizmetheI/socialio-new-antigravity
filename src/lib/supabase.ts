import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TEST_MODE } from './testMode/flag';
import { mockSupabaseClient } from './testMode/mockClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// createClient throws synchronously on an empty or non-URL string, which would crash
// the whole app at import time (this module loads eagerly via page imports, not just
// when a Supabase-backed feature actually runs). Fall back to a syntactically valid
// placeholder so the app boots; real calls then fail gracefully with a normal { error }.
const isConfigured = supabaseUrl.startsWith('http') && supabaseAnonKey.length > 0;

if (!isConfigured && !TEST_MODE) {
  console.warn('Missing Supabase environment variables. Please check your .env file.');
}

const realClient = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder-anon-key'
);

// TEST_MODE swaps in an in-memory fixture client (src/lib/testMode/) so the
// dashboard can be clicked through before real Supabase credentials exist.
// Every page still calls the same supabase.from(...)/storage/functions API —
// only this one export changes.
export const supabase: SupabaseClient = TEST_MODE
  ? (mockSupabaseClient as unknown as SupabaseClient)
  : realClient;
