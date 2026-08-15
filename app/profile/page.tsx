'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/community';
import { THEMES, DEFAULT_THEME_ID } from '../../lib/themes';

export default function MyProfilePage() {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [hoods, setHoods] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [zip, setZip] = useState('');
  const [neighborhoodId, setNeighborhoodId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const router = useRouter();

  const theme = THEMES[themeId] || THEMES.royals;

  useEffect(() => {
    const savedTheme = localStorage.getItem('nkc_theme');
    if (savedTheme && THEMES[savedTheme]) setThemeId(savedTheme);

    (async () => {
      const [{ data: hoodsData }, { data: { user: currentUser } }] = await Promise.all([
        supabase.from('neighborhoods').select('*').order('name'),
        supabase.auth.getUser(),
      ]);
      setHoods(hoodsData || []);
      if (!currentUser) { setLoading(false); return; }
      setUser(currentUser);

      const { data: existing } = await supabase
        .from('profiles')
        .select('id,auth_user_id,full_name,email,street_address,zip,neighborhood_id,avatar_url,is_admin,is_founder')
        .eq('auth_user_id', currentUser.id)
        .maybeSingle();

      const fallbackName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '';
      setProfile(existing || null);
      setName(existing?.full_name || fallbackName);
      setZip(existing?.zip || '');
      setNeighborhoodId(existing?.neighborhood_id || '');
      setAvatarUrl(existing?.avatar_url || '');
      setLoading(false);
    })();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      const selectedHood = hoods.find(h => String(h.id) === String(neighborhoodId));
      let nextAvatarUrl = avatarUrl || null;
      if (avatarFile) {
        setAvatarUploading(true);
        const ext = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from('profile-photos').upload(path, avatarFile, { contentType: avatarFile.type || 'image/jpeg', upsert: true, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('profile-photos').getPublicUrl(path);
        nextAvatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;
      }
      const payload = {
        auth_user_id: user.id,
        full_name: name.trim(),
        email: user.email || profile?.email || '',
        // Some older Neighborly KC Supabase schemas require street_address
        // even though the app does not display or collect a street address.
        // Keep it private and satisfy that legacy NOT NULL constraint with
        // an empty value for new profiles; preserve an existing value if one exists.
        street_address: profile?.street_address || '',
        zip: zip.trim(),
        neighborhood_id: selectedHood?.id || null,
        avatar_url: nextAvatarUrl,
      };
      let data:any = null;
      let error:any = null;
      if (profile?.id) {
        ({ data, error } = await supabase.from('profiles').update(payload).eq('id', profile.id).select('id,auth_user_id,full_name,email,street_address,zip,neighborhood_id,avatar_url,is_admin,is_founder').single());
      } else {
        // Create the row explicitly. This works even on older production schemas
        // where profiles.id did not have a database default.
        const profileId = globalThis.crypto?.randomUUID?.() || `${user.id}-${Date.now()}`;
        ({ data, error } = await supabase
          .from('profiles')
          .insert({ id: profileId, ...payload })
          .select('id,auth_user_id,full_name,email,street_address,zip,neighborhood_id,avatar_url,is_admin,is_founder')
          .single());
      }
      if (error) throw error;
      setAvatarUrl(nextAvatarUrl || '');
      setAvatarFile(null);
      setProfile(data);
      localStorage.setItem('nkc_profile', JSON.stringify({ ...data, user_id: user.id }));
      setSaved(true);
      // Saving the profile is the end of this flow on mobile and desktop.
      // Return the user directly to the feed so they don't have to scroll back
      // to the top of the profile page to find the Feed link.
      window.setTimeout(() => router.push('/'), 250);
    } catch (err: any) {
      alert(err.message || 'Could not save your profile.');
    } finally {
      setAvatarUploading(false);
      setSaving(false);
    }
  };

  if (loading) return <main className="min-h-screen grid place-items-center" style={{ backgroundColor: theme.bg, color: theme.text }}>Loading profile…</main>;

  if (!user) return (
    <main className="min-h-screen grid place-items-center p-6" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <div className="w-full max-w-md rounded-3xl p-7 border text-center" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
        <div className="mx-auto mb-4 w-16 h-16 rounded-full grid place-items-center text-2xl font-black" style={{ backgroundColor: theme.input }}>KC</div>
        <h1 className="text-2xl font-black">Create your Neighborly KC profile</h1>
        <p className="text-sm opacity-60 mt-2">Sign in first, then you can create and edit your profile.</p>
        <Link href="/" className="inline-flex mt-5 rounded-full px-5 py-3 font-bold" style={{ backgroundColor: theme.accent, color: theme.pillTextActive }}>← Back to Neighborly KC</Link>
      </div>
    </main>
  );

  const initials = (name || 'Neighbor').split(/\s+/).map((x: string) => x[0]).join('').slice(0, 2).toUpperCase();
  const selectedHood = hoods.find(h => String(h.id) === String(neighborhoodId));

  return (
    <main className="min-h-screen" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <header className="border-b" style={{ backgroundColor: theme.header, borderColor: theme.border }}>
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-xs text-white/70 hover:text-white">← Feed</Link>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">My Profile</h1>
            <p className="text-xs text-white/60">Create and edit how neighbors see you.</p>
          </div>
          {profile ? <Link href={`/profile/${user.id}`} className="rounded-full px-4 py-2 text-sm font-bold" style={{ backgroundColor: theme.card, color: theme.text }}>View profile</Link> : <span className="rounded-full px-4 py-2 text-sm font-bold opacity-60" style={{ backgroundColor: theme.card, color: theme.text }}>Save profile to publish</span>}
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-5 sm:p-8">
        <section className="rounded-3xl border p-6 sm:p-8" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <div className="flex items-center gap-4 mb-7">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden grid place-items-center text-2xl font-black border-4" style={{ backgroundColor: theme.input, borderColor: theme.border }}>
                {avatarUrl ? <img src={avatarUrl} alt="Your profile photo" className="w-full h-full object-cover" /> : initials}
              </div>
              <label className="absolute -bottom-1 -right-1 rounded-full px-2 py-1 text-[10px] font-black cursor-pointer shadow-lg" style={{ backgroundColor: theme.accent, color: theme.pillTextActive }}>
                📷
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f){ if(f.size>8*1024*1024){alert('Profile photos must be 8 MB or smaller.'); return;} setAvatarFile(f); const r=new FileReader(); r.onload=()=>setAvatarUrl(String(r.result||'')); r.readAsDataURL(f); } }} />
              </label>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-black opacity-45">Neighborly KC member</p>
              <h2 className="text-xl font-black">{name || 'Your name'}</h2>
              <p className="text-sm opacity-55">{selectedHood?.name || 'Choose your neighborhood below'}</p>
              <p className="text-xs opacity-45 mt-1">Tap 📷 to add your photo. It can appear next to your posts.</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-5">
            <label className="block">
              <span className="block text-sm font-bold mb-2">Display name</span>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="w-full rounded-2xl px-4 py-3.5 outline-none border" style={{ backgroundColor: theme.input, color: theme.text, borderColor: theme.border }} />
            </label>

            <label className="block">
              <span className="block text-sm font-bold mb-2">Email</span>
              <input value={user.email || ''} readOnly className="w-full rounded-2xl px-4 py-3.5 outline-none border opacity-70" style={{ backgroundColor: theme.input, color: theme.text, borderColor: theme.border }} />
              <span className="block text-xs opacity-45 mt-1.5">Your sign-in email is kept with your account.</span>
            </label>

            <div className="grid sm:grid-cols-2 gap-5">
              <label className="block">
                <span className="block text-sm font-bold mb-2">Neighborhood</span>
                <select value={neighborhoodId} onChange={e => setNeighborhoodId(e.target.value)} className="w-full rounded-2xl px-4 py-3.5 outline-none border" style={{ backgroundColor: theme.input, color: theme.text, borderColor: theme.border }}>
                  <option value="">Choose neighborhood</option>
                  {hoods.map(h => <option key={h.id} value={h.id}>{h.name}{h.zip ? ` • ${h.zip}` : ''}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="block text-sm font-bold mb-2">ZIP code</span>
                <input inputMode="numeric" maxLength={10} value={zip} onChange={e => setZip(e.target.value)} placeholder="64155" className="w-full rounded-2xl px-4 py-3.5 outline-none border" style={{ backgroundColor: theme.input, color: theme.text, borderColor: theme.border }} />
              </label>
            </div>

            <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: theme.input }}>
              <b>Privacy note</b>
              <p className="opacity-60 mt-1">Your public profile shows your name, neighborhood and ZIP. Your street address is not displayed on your public profile.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link href="/" className="flex-1 text-center rounded-full py-3.5 font-bold border" style={{ borderColor: theme.border, backgroundColor: theme.input }}>Cancel</Link>
              <button disabled={saving} className="flex-1 rounded-full py-3.5 font-black disabled:opacity-50" style={{ backgroundColor: theme.accent, color: theme.pillTextActive }}>{avatarUploading ? 'Uploading photo…' : saving ? 'Saving…' : 'Save Profile'}</button>
            </div>
          </form>
        </section>
      </div>

      {saved && <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 rounded-full px-5 py-3 shadow-xl font-bold text-sm" style={{ backgroundColor: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}>✓ Profile saved</div>}
    </main>
  );
}
