import { createClient } from '@supabase/supabase-js';

/**
 * Single shared Supabase browser client for the whole app.
 *
 * IMPORTANT: do not create another createClient() anywhere else in the client
 * bundle. Two GoTrueClient instances in one tab fight over the same auth
 * storage and cause random "not signed in" states.
 *
 * detectSessionInUrl is intentionally FALSE. app/page.tsx performs the PKCE
 * code exchange explicitly and exactly once. When both the automatic detector
 * and the manual exchange run, they race for the same one-time PKCE verifier;
 * whichever loses throws "invalid request: both auth code and code verifier
 * should be non-empty" and the first sign-in attempt silently fails.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storageKey: 'neighborly-kc-auth',
    },
  }
);

/**
 * Realtime respects row level security, but only if the socket is opened with
 * the signed-in user's JWT. Without this, RLS-protected tables such as `dms`
 * silently deliver zero change events and incoming messages never appear until
 * a manual refresh.
 */
export async function authorizeRealtime() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    supabase.realtime.setAuth(session.access_token);
    return true;
  }
  return false;
}

export const displayName = (profile: any) =>
  profile?.full_name || profile?.email?.split('@')[0] || 'Neighbor';
