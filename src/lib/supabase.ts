import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const SUPABASE_URL  = (import.meta.env.VITE_SUPABASE_URL  as string | undefined)?.trim();
const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** False when URL/key are missing — common on Vercel if env vars were not added. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON);

// Process-only lock avoids Navigator Lock API "steal" AbortError in single-tab use.
// Multi-tab session coordination is disabled; acceptable for typical single-tab usage.
const supabaseOrNull: SupabaseClient<Database> | null =
  isSupabaseConfigured && SUPABASE_URL && SUPABASE_ANON
    ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          lock: (_name, _acquireTimeout, fn) => fn(),
        },
      })
    : null;

/**
 * Typed as always defined for callers; at runtime it is only null when `!isSupabaseConfigured`.
 * `App` returns early in that case, so feature code and `AuthProvider` never run against null.
 */
export const supabase = supabaseOrNull as SupabaseClient<Database>;

const notConfigured = () =>
  Promise.reject(
    new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy.',
    ),
  );

// ─── Auth helpers ──────────────────────────────────────────────────
export const signInWithEmail = (email: string, password: string) =>
  supabaseOrNull?.auth.signInWithPassword({ email, password }) ?? notConfigured();

export const signUpWithEmail = (email: string, password: string) =>
  supabaseOrNull?.auth.signUp({ email, password }) ?? notConfigured();

export const signInWithGoogle = () =>
  supabaseOrNull?.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  }) ?? notConfigured();

export const signOut = () => supabaseOrNull?.auth.signOut() ?? notConfigured();

export const resetPassword = (email: string) =>
  supabaseOrNull?.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset`,
  }) ?? notConfigured();
