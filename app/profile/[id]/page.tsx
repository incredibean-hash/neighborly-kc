'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/community';
import { THEMES, DEFAULT_THEME_ID } from '../../../lib/themes';

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [profile, setProfile] = useState<any>(null);
  const [hood, setHood] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const theme = THEMES[themeId] || THEMES.royals;

  useEffect(() => {
    const savedTheme = localStorage.getItem('nkc_theme');
    if (savedTheme && THEMES[savedTheme]) setThemeId(savedTheme);
    (async () => {
      const { data: p } = await supabase.from('profiles').select('auth_user_id,full_name,email,zip,neighborhood_id,created_at').eq('auth_user_id', params.id).maybeSingle();
      setProfile(p || null);
      if (p?.neighborhood_id) {
        const { data: h } = await supabase.from('neighborhoods').select('name,zip').eq('id', p.neighborhood_id).maybeSingle();
        setHood(h || null);
      }
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) return <main className="min-h-screen grid place-items-center" style={{ backgroundColor: theme.bg, color: theme.text }}>Loading profile…</main>;

  if (!profile) return (
    <main className="min-h-screen grid place-items-center p-6" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <div className="text-center"><h1 className="text-2xl font-black">Profile not found</h1><Link href="/people" className="inline-block mt-4 underline">← Back to People</Link></div>
    </main>
  );

  const initials = (profile.full_name || 'Neighbor').split(/\s+/).map((x: string) => x[0]).join('').slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <header className="border-b" style={{ backgroundColor: theme.header, borderColor: theme.border }}>
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between gap-3">
          <div><Link href="/people" className="text-xs text-white/70 hover:text-white">← People</Link><h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Neighbor Profile</h1></div>
          <Link href="/" className="rounded-full px-4 py-2 text-sm font-bold" style={{ backgroundColor: theme.card, color: theme.text }}>Feed</Link>
        </div>
      </header>
      <div className="max-w-3xl mx-auto p-5 sm:p-8">
        <section className="rounded-3xl border p-7 sm:p-9" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-24 h-24 rounded-full grid place-items-center text-3xl font-black border-4" style={{ backgroundColor: theme.input, borderColor: theme.border }}>{initials}</div>
            <div>
              <p className="text-xs uppercase tracking-widest font-black opacity-45">Neighborly KC</p>
              <h2 className="text-3xl font-black mt-1">{profile.full_name || 'Neighbor'}</h2>
              <p className="text-sm opacity-60 mt-1">📍 {hood?.name || 'Kansas City'}{profile.zip ? ` • ${profile.zip}` : ''}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-8">
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.input }}><p className="text-xs font-black uppercase opacity-45">Neighborhood</p><p className="font-bold mt-1">{hood?.name || 'Kansas City'}</p></div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.input }}><p className="text-xs font-black uppercase opacity-45">ZIP</p><p className="font-bold mt-1">{profile.zip || 'Not listed'}</p></div>
          </div>
          <p className="text-xs opacity-45 mt-5">Street address is not displayed publicly.</p>
          <div className="flex flex-wrap gap-3 mt-6"><Link href="/people" className="rounded-full px-5 py-3 font-bold border" style={{ backgroundColor: theme.input, borderColor: theme.border }}>← Back to People</Link><Link href="/" className="rounded-full px-5 py-3 font-bold" style={{ backgroundColor: theme.accent, color: theme.pillTextActive }}>Back to Feed</Link></div>
        </section>
      </div>
    </main>
  );
}
