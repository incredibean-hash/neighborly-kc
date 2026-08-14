import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'neighborly-kc-auth',
    },
  }
);

export const displayName = (profile: any) =>
  profile?.full_name || profile?.email?.split('@')[0] || 'Neighbor';
