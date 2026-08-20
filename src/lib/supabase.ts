import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Export a supabase client only when both env vars are present. This keeps
 * the app functional in a $0 prototyping mode (localStorage demo) while
 * enabling Supabase when the env is configured.
 */
export const supabase = (supabaseUrl && supabaseAnonKey)
	? createClient(supabaseUrl, supabaseAnonKey)
	: null;
