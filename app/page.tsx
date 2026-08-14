'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/community';
import { THEMES, DEFAULT_THEME_ID } from '../lib/themes';

const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];



async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Images must be 15 MB or smaller.');
  const img = document.createElement('img');
  const canvas = document.createElement('canvas');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not decode that image.'));
    img.src = dataUrl;
  });
  const max = 1200;
  let { width, height } = img;
  if (width > max || height > max) {
    if (width > height) { height = Math.round(height * max / width); width = max; }
    else { width = Math.round(width * max / height); height = max; }
  }
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is not available in this browser.');
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not prepare that image.')), 'image/jpeg', 0.78);
  });
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

async function withTimeout<T>(promise: PromiseLike<T>, ms = 30000): Promise<T> {
  return await Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Upload timed out. Please try the image again.')), ms))
  ]);
}

async function syncCommunityProfile(user:any, fallback?:any){
  if(!user) return null;
  const profile = {
    id: user.id,
    auth_user_id: user.id,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || fallback?.full_name || user.email?.split('@')[0] || 'Neighbor',
    email: user.email || fallback?.email || '',
    street_address: fallback?.street_address || '',
    zip: fallback?.zip || '',
  };
  const { data: saved } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict:'auth_user_id' })
    .select('auth_user_id,full_name,email,street_address,zip,is_admin,is_founder')
    .single();
  return {...fallback, ...profile, ...(saved || {}), user_id:user.id};
}

export default function Page(){
  const [hoods,setHoods]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [comments,setComments]=useState<Record<string,any[]>>({});
  const [likes,setLikes]=useState<Record<string,any[]>>({});
  const [cLikes,setCLikes]=useState<Record<string,any[]>>({});
  const [openComments,setOpenComments]=useState<Record<string,boolean>>({});
  const [commentText,setCommentText]=useState<Record<string,string>>({});
  const [hood,setHood]=useState('Meadow Brooks Heights');
  const [cat,setCat]=useState('All');
  const [scope,setScope]=useState<'local'|'kc'>('local');
  const [showExplore,setShowExplore]=useState(false);
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [themeId,setThemeId]=useState(DEFAULT_THEME_ID);
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [addr,setAddr]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [googleLoading,setGoogleLoading]=useState(false);
  const [authReady,setAuthReady]=useState(false);
  const [postSuccess,setPostSuccess]=useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const theme = THEMES[themeId] || THEMES['royals'];

  const loadAll = async (postIds:string[]) => {
    if(!postIds.length) return;
    const {data:com}=await supabase.from('comments').select('*').in('post_id', postIds).order('created_at',{ascending:false});
    if(com){
      const g: Record<string,any[]> = {}; com.forEach((c:any)=>{ if(!g[c.post_id]) g[c.post_id]=[]; g[c.post_id].push(c); });
      setComments(g);
      const cIds=com.map((c:any)=>c.id);
      if(cIds.length){ const {data:cl}=await supabase.from('likes').select('*').in('comment_id', cIds); if(cl){ const cg: Record<string,any[]> = {}; cl.forEach((l:any)=>{ if(!cg[l.comment_id]) cg[l.comment_id]=[]; cg[l.comment_id].push(l); }); setCLikes(cg); } }
    }
    const {data:lk}=await supabase.from('likes').select('*').in('post_id', postIds).is('comment_id', null);
    if(lk){ const lg: Record<string,any[]> = {}; lk.forEach((l:any)=>{ if(!lg[l.post_id]) lg[l.post_id]=[]; lg[l.post_id].push(l); }); setLikes(lg); }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? window.location.origin : 'https://neighborlykc.com');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: siteUrl.replace(/\/$/, '') } });
    if(error){ alert('Google login failed: '+error.message); setGoogleLoading(false); }
  };

  useEffect(()=>{
    const saved = localStorage.getItem('nkc_theme');
    setThemeId(saved && THEMES[saved] ? saved : DEFAULT_THEME_ID);
    let alive = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const applySession = (user:any) => {
      if(!user || !alive) return;
      // Show the signed-in UI immediately, then hydrate the full profile in the
      // next task. This prevents the OAuth callback from briefly looking logged out.
      setShowJoin(false);
      setProfile((current:any)=>current || {
        user_id:user.id,
        auth_user_id:user.id,
        full_name:user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Neighbor',
        email:user.email || ''
      });
      window.setTimeout(() => {
        void syncCommunityProfile(user).then(pr=>{
          if(alive && pr){
            localStorage.setItem('nkc_profile', JSON.stringify(pr));
            setProfile(pr);
          }
        });
      }, 0);
    };

    // Register the auth listener before restoring/exchanging a session so the
    // UI reacts immediately when Supabase establishes the authenticated user.
    const { data } = supabase.auth.onAuthStateChange((event, sess)=>{
      if(!alive) return;
      if(sess?.user){
        applySession(sess.user);
        setAuthReady(true);
      } else if(event === 'SIGNED_OUT'){
        localStorage.removeItem('nkc_profile');
        setProfile(null);
        setShowJoin(false);
        setAuthReady(true);
      }
    });
    subscription = data.subscription;

    (async()=>{
      // Load public feed data independently of authentication.
      const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false});
      if(h && alive) setHoods(h);
      const {data:p}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(50);
      if(p && alive){ setPosts(p); void loadAll(p.map((x:any)=>x.id)); }

      // We handle the PKCE callback explicitly so the first Google login cannot
      // render the app before the OAuth code has been exchanged for a session.
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if(code){
        const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code);
        if(!alive) return;
        if(error){
          console.error('OAuth callback error:', error);
          localStorage.removeItem('nkc_profile');
          setProfile(null);
          setAuthReady(true);
          return;
        }
        window.history.replaceState({}, '', window.location.pathname);
        if(exchanged?.user){
          applySession(exchanged.user);
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if(!alive) return;
        if(session?.user){
          applySession(session.user);
        } else {
          localStorage.removeItem('nkc_profile');
          setProfile(null);
        }
      }
      setAuthReady(true);
    })();

    return ()=>{ alive=false; subscription?.unsubscribe(); };
  },[]);

  const setTheme = (id:string)=>{ setThemeId(id); localStorage.setItem('nkc_theme', id); };
const cur = hoods.find((x:any)=>x.slug==hood) || hoods[0] || {name:'Meadow Brooks Heights', zip:'64155', id: '5fb249cb-1667-475b-ab8c-43e1df245ace', slug:'meadow-brooks-heights'};
  const scopedPosts = scope==='local'
    ? posts.filter((p:any)=>!p.neighborhood_id || String(p.neighborhood_id)===String(cur?.id||''))
    : posts;
  const filtered = cat==='All'? scopedPosts : scopedPosts.filter((p:any)=>p.category===cat);
  const neighborhoodName = (id:any) => hoods.find((h:any)=>String(h.id)===String(id))?.name || cur?.name || 'Kansas City';
  const isAdmin = Boolean(profile?.is_admin || profile?.is_founder);
  const POST_LIMIT_24H = 5;

  const getRecentPostCount = async (userId:string) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase.from('posts').select('id', { count:'exact', head:true }).eq('user_id', userId).gte('created_at', since);
    if(error) return 0;
    return count || 0;
  };

   const handleBePost = async () => {
    if (!profile) return setShowJoin(true);
    if (!body.trim() && !file) return;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { alert('You must be signed in to post'); return; }
    if (!isAdmin) {
      const recentCount = await getRecentPostCount(currentUser.id);
      if (recentCount >= POST_LIMIT_24H) {
        alert(`You can make up to ${POST_LIMIT_24H} posts in 24 hours. Please try again later.`);
        return;
      }
    }
    setUploading(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const compressed = await compressImage(file);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: upErr } = await withTimeout(supabase.storage.from('post-images').upload(path, compressed), 30000);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path);
        image_url = publicUrl;
      }
      const realId = hoods?.find((x: any) => x.slug == hood)?.id || cur?.id || '5fb249cb-1667-475b-ab8c-43e1df245ace';
      const user = currentUser;
      const { data, error } = await supabase.from('posts').insert({
        body,
        category: cat === 'All' ? 'General' : cat,
        user_id: user.id,
        author_id: user.id,
        neighborhood_id: realId,
        image_url,
        author_name: profile?.full_name || 'Neighbor'
      }).select().single();

      if (error) throw error;
      setPosts([{ ...data, profiles: { full_name: profile.full_name } }, ...posts]);
      setBody('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPostSuccess(true);
      window.setTimeout(() => setPostSuccess(false), 3500);
    } catch (e: any) {
      alert('Could not save: ' + (e.message || e));
    } finally {
      setUploading(false);
    }
  };

  const addComment = async (postId:string) => { if(!profile) return setShowJoin(true); const text=commentText[postId]?.trim(); if(!text) return; const {data, error}=await supabase.from('comments').insert({ post_id: postId, content:text, body:text, author_name:profile.full_name, author_id:profile.user_id }).select().single(); if(error) return alert(error.message); setComments((prev)=> ({...prev, [postId]: [data,...(prev[postId]||[])]})); setCommentText((prev)=>({...prev,[postId]:''})); };
  const togglePostLike = async (postId:string) => {
    if(!profile) return setShowJoin(true);
    const { data: { user } } = await supabase.auth.getUser();
    const authorId = user?.id || profile?.user_id;
    if(!authorId) return setShowJoin(true);
    const list = likes[postId] || [];
    const myLike = list.find((l:any)=>l.author_id===authorId || l.author_name===profile.full_name);
    if(myLike){
      const { error } = await supabase.from('likes').delete().eq('id', myLike.id);
      if(error) return alert('Could not update like: ' + error.message);
      setLikes(prev=>({...prev, [postId]:(prev[postId]||[]).filter((x:any)=>x.id!==myLike.id)}));
    } else {
      const { data, error } = await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name, author_id:authorId}).select().single();
      if(error) return alert('Could not like this post: ' + error.message);
      if(data) setLikes(prev=>({...prev, [postId]:[...(prev[postId]||[]), data]}));
    }
  };
  const toggleCommentLike = async (commentId:string) => {
    if(!profile) return setShowJoin(true);
    const { data: { user } } = await supabase.auth.getUser();
    const authorId = user?.id || profile?.user_id;
    if(!authorId) return setShowJoin(true);
    const list = cLikes[commentId] || [];
    const myLike = list.find((l:any)=>l.author_id===authorId || l.author_name===profile.full_name);
    if(myLike){
      const { error } = await supabase.from('likes').delete().eq('id', myLike.id);
      if(error) return alert('Could not update like: ' + error.message);
      setCLikes(prev=>({...prev, [commentId]:(prev[commentId]||[]).filter((x:any)=>x.id!==myLike.id)}));
    } else {
      const { data, error } = await supabase.from('likes').insert({comment_id:commentId, author_name:profile.full_name, author_id:authorId}).select().single();
      if(error) return alert('Could not like this comment: ' + error.message);
      if(data) setCLikes(prev=>({...prev, [commentId]:[...(prev[commentId]||[]), data]}));
    }
  };
  const deletePost = async (id:string, image_url:string|null) => { if(!confirm('Delete this post?')) return; if(image_url){ const path = image_url.split('/post-images/')[1]; if(path) await supabase.storage.from('post-images').remove([path]); } await supabase.from('posts').delete().eq('id', id); setPosts(posts.filter((p:any)=>p.id!==id)); };
  const deleteComment = async (id:string, postId:string) => { if(!confirm('Delete comment?')) return; await supabase.from('comments').delete().eq('id', id); setComments((prev)=>({...prev, [postId]: prev[postId].filter((c:any)=>c.id!==id)})); };

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{backgroundColor: theme.bg, color: theme.text}}>
      <header className="sticky top-0 z-40 overflow-hidden border-b" style={{backgroundColor: theme.header, borderColor: theme.border}}>
        <div className="relative">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex items-center gap-2 sm:gap-3 min-w-0 relative z-10">
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="font-black text-lg sm:text-xl tracking-tight text-white">Neighborly KC</h1>
              <p className="text-[10px] sm:text-xs -mt-1 text-white/60">Kansas City • 40 Mile Radius</p>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
            <a href="/people" className="hidden sm:inline px-3 py-1.5 rounded-full text-xs font-bold" style={{backgroundColor: theme.card, color: theme.text, border: `1px solid ${theme.border}`}}>People</a>
            <a href="/dms" aria-label="Messages" className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold" style={{backgroundColor: theme.card, color: theme.text, border: `1px solid ${theme.border}`}}>💬</a>
            <a href="/notifications" aria-label="Notifications" className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold" style={{backgroundColor: theme.card, color: theme.text, border: `1px solid ${theme.border}`}}>🔔</a>
            <button onClick={()=>setShowSettings(true)} aria-label="Themes" className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: theme.card, border: `1px solid ${theme.border}`}}>⚙️</button>
            {!authReady ? <span className="shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-black opacity-50">Loading…</span> : profile ? <><span className="text-xs hidden lg:block opacity-60 max-w-28 truncate">{profile.full_name}</span><button onClick={()=>{localStorage.removeItem('nkc_profile'); void supabase.auth.signOut(); setProfile(null);}} className="hidden sm:inline px-3 py-1.5 rounded-full text-xs font-bold" style={{backgroundColor: theme.card, color: theme.text, border: `1px solid ${theme.border}`}}>Sign out</button></> : <button onClick={()=>setShowJoin(true)} className="shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-black whitespace-nowrap" style={{backgroundColor: theme.pillActive, color: theme.pillTextActive}}>Join</button>}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-8 sm:h-10 opacity-90 pointer-events-none" aria-hidden="true">
            <svg viewBox="0 0 620 70" className="w-full h-full" preserveAspectRatio="none"><path d="M0 64h42V43h18v21h18V31h20v33h18V48h13V64h19V20h8v44h13V38h20v26h18V50h10v14h18V12h9v52h15V33h14v31h20V44h12v20h16V28h9v36h17V8h7v56h18V25h17v39h15V42h12v22h17V34h8v30h17V18h6v46h18V39h12v25h18V29h9v35h20V46h13v18h20V36h10v28h18V14h6v50h22V52h14v12h32v-8h-18v-11h-12V33h-10v23h-13V24h-12v32h-14V44h-13v12h-18V29h-10v27h-15V17h-8v39h-18V40h-12v16h-20V26h-9v30h-18V36h-10v20h-19V15h-7v41h-20V33h-12v23h-19V47h-11v9h-20V28h-8v28h-22V39h-12v17h-19V22h-8v34h-19V42h-13v14H0Z" fill="currentColor" className="text-white/25"/></svg>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-3 flex gap-2 justify-center flex-wrap relative z-10">
          <button onClick={()=>setCat('All')} className="px-4 py-1.5 rounded-full text-sm font-bold" style={{backgroundColor: cat==='All'?theme.pillActive:theme.pillInactive,color:cat==='All'?theme.pillTextActive:theme.text,border:`1px solid ${theme.border}`}}>Feed</button>
          <button onClick={()=>setCat('Safety Alert')} className="px-4 py-1.5 rounded-full text-sm font-bold" style={{backgroundColor: cat==='Safety Alert'?theme.pillActive:theme.pillInactive,color:cat==='Safety Alert'?theme.pillTextActive:theme.text,border:`1px solid ${theme.border}`}}>Safety</button>
          <button onClick={()=>setCat('For Sale & Free')} className="px-4 py-1.5 rounded-full text-sm font-bold" style={{backgroundColor: cat==='For Sale & Free'?theme.pillActive:theme.pillInactive,color:cat==='For Sale & Free'?theme.pillTextActive:theme.text,border:`1px solid ${theme.border}`}}>For Sale</button>
          <button onClick={()=>setShowExplore(v=>!v)} className="px-4 py-1.5 rounded-full text-sm font-bold" style={{backgroundColor:showExplore?theme.pillActive:theme.pillInactive,color:showExplore?theme.pillTextActive:theme.text,border:`1px solid ${theme.border}`}}>Explore ▾</button>
        </div>
        {showExplore && <div className="max-w-6xl mx-auto px-6 pb-3 flex gap-2 justify-center flex-wrap">
          <a href="/people" className="px-4 py-1.5 rounded-full text-sm font-bold" style={{backgroundColor:theme.card,color:theme.text,border:`1px solid ${theme.border}`}}>👥 People</a>
          <a href="/dms" className="px-4 py-1.5 rounded-full text-sm font-bold" style={{backgroundColor:theme.card,color:theme.text,border:`1px solid ${theme.border}`}}>💬 Messages</a>
          <a href="/notifications" className="px-4 py-1.5 rounded-full text-sm font-bold" style={{backgroundColor:theme.card,color:theme.text,border:`1px solid ${theme.border}`}}>🔔 Notifications</a>
          <button onClick={()=>setCat('Event')} className="px-4 py-1.5 rounded-full text-sm font-bold" style={{backgroundColor:theme.card,color:theme.text,border:`1px solid ${theme.border}`}}>📅 Events</button>
          <button onClick={()=>setCat('Lost & Found')} className="px-4 py-1.5 rounded-full text-sm font-bold" style={{backgroundColor:theme.card,color:theme.text,border:`1px solid ${theme.border}`}}>🔎 Lost & Found</button>
        </div>}
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-6">
        <aside className="rounded-2xl p-3 h-fit border hidden lg:block" style={{backgroundColor: theme.card, borderColor: theme.border}}><p className="text-xs font-bold px-3 py-2 opacity-40">FILTER</p>{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className="w-full text-left px-3 py-2.5 rounded-xl text-sm" style={{backgroundColor: cat===c? theme.accent : 'transparent', color: cat===c? theme.pillTextActive : theme.text}}>{c}</button>)}</aside>

        <main className="space-y-3">
          <div className="rounded-2xl p-4 border" style={{backgroundColor: theme.card, borderColor: theme.border}}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div><p className="text-xs font-black uppercase tracking-wider opacity-50">Neighborly KC Network</p><h2 className="text-xl font-black">{scope==='local'?cur?.name:'All Kansas City'}</h2><p className="text-xs opacity-55">{scope==='local'?'Your neighborhood and nearby local conversation':'Everyone inside the 40-mile Neighborly KC network'}</p></div>
              <div className="flex rounded-full p-1 gap-1" style={{backgroundColor:theme.input,border:`1px solid ${theme.border}`}}>
                <button onClick={()=>setScope('local')} className="px-4 py-2 rounded-full text-xs font-black" style={{backgroundColor:scope==='local'?theme.pillActive:'transparent',color:scope==='local'?theme.pillTextActive:theme.text}}>📍 My Area</button>
                <button onClick={()=>setScope('kc')} className="px-4 py-2 rounded-full text-xs font-black" style={{backgroundColor:scope==='kc'?theme.pillActive:'transparent',color:scope==='kc'?theme.pillTextActive:theme.text}}>🏙️ All KC</button>
              </div>
            </div>
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?(scope==='kc'?'What should Kansas City know?':`What's up in ${cur?.name}?`):'Join Neighborly KC to post...'} className="w-full rounded-xl p-3 min-h-[80px] text-sm outline-none" style={{backgroundColor: theme.input, color: theme.text, border: `1px solid ${theme.border}`}} />
            <div className="flex items-center gap-2 mt-3 min-w-0">
  <label htmlFor="file-input" className="shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold" style={{borderColor:theme.border}}>Choose image</label>
  <input key={fileInputKey} ref={fileInputRef} id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="sr-only" />
  {file && <div className="min-w-0 flex items-center gap-2 text-xs opacity-70"><span className="truncate max-w-[180px]" title={file.name}>{file.name}</span><button type="button" onClick={()=>{setFile(null); if(fileInputRef.current) fileInputRef.current.value=''; setFileInputKey(k=>k+1);}} className="shrink-0 font-black" aria-label="Remove selected image">✕</button></div>}
</div>
            <div className="flex justify-end mt-2"><button disabled={uploading} onClick={handleBePost} className="px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50" style={{backgroundColor: theme.accent, color: theme.pillTextActive}}>{uploading?'Uploading...':scope==='kc'?'Post to KC':'Post to neighbors'}</button></div>
          </div>

          {filtered.map((p:any)=>{ const cList=comments[p.id]||[]; const isOpen=openComments[p.id]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_id===profile?.user_id || l.author_name===profile?.full_name); const isOwner = profile && (p.profiles?.full_name===profile.full_name || p.author_name===profile.full_name); const canDelete = isOwner || isAdmin; return (
            <div key={p.id} className="rounded-2xl p-4 border" style={{backgroundColor: theme.card, borderColor: theme.border}}><div className="flex justify-between gap-3"><div><p className="text-xs font-bold opacity-60">{(p.user_id||p.author_id)?<a href={`/profile/${p.user_id||p.author_id}`} className="hover:underline">{p.profiles?.full_name||p.author_name||'Neighbor'}</a>:(p.profiles?.full_name||p.author_name||'Neighbor')} · {p.category}</p>{scope==='kc' && <p className="text-[11px] font-bold mt-1 opacity-45">📍 {neighborhoodName(p.neighborhood_id)}</p>}</div>{canDelete && <button onClick={()=>deletePost(p.id,p.image_url)} className="text-xs opacity-40 hover:text-red-600">🗑️ Delete</button>}</div><p className="mt-1 whitespace-pre-wrap">{p.body || p.content}</p>{p.image_url && <img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[400px] w-full object-cover border" style={{borderColor: theme.border}} />}<p className="text-xs opacity-40 mt-2">{new Date(p.created_at).toLocaleString()}</p><div className="mt-3 pt-3 border-t flex gap-4" style={{borderColor: theme.border}}><button onClick={()=>togglePostLike(p.id)} className="text-xs font-bold">{liked?'❤️':'🤍'} {pLikes.length}</button><button onClick={()=>setOpenComments((prev)=>({...prev,[p.id]:!prev[p.id]}))} className="text-xs font-bold opacity-60">💬 {cList.length} {isOpen?'▲':'▼'}</button></div>{isOpen && (<div className="mt-3 rounded-xl p-3 space-y-2" style={{backgroundColor: theme.input}}>{cList.map((c:any)=>{ const cl=cLikes[c.id]||[]; const cliked=cl.some((l:any)=>l.author_id===profile?.user_id || l.author_name===profile?.full_name); const canDelC = (profile && c.author_name===profile.full_name) || isAdmin; return (<div key={c.id} className="text-sm rounded-lg p-2 flex justify-between gap-2" style={{backgroundColor: theme.card}}><div><b className="text-xs">{c.author_name}:</b> {c.content||c.body} <button onClick={()=>toggleCommentLike(c.id)} className="ml-3 text-xs">{cliked?'❤️':'🤍'} {cl.length}</button></div>{canDelC && <button onClick={()=>deleteComment(c.id,p.id)} className="text-[10px] opacity-30">🗑️</button>}</div>);})}<div className="flex gap-2 pt-2"><input value={commentText[p.id]||''} onChange={e=>setCommentText((prev)=>({...prev,[p.id]:e.target.value}))} placeholder="Add a comment..." className="flex-1 border rounded-full px-3 py-2 text-sm outline-none" style={{backgroundColor: theme.card, borderColor: theme.border, color: theme.text}} /><button onClick={()=>addComment(p.id)} className="px-4 py-2 rounded-full text-xs font-bold" style={{backgroundColor: theme.accent, color: theme.pillTextActive}}>Reply</button></div></div>)}</div>
          )})}
        </main>

        <aside className="rounded-2xl p-5 border h-fit" style={{backgroundColor: theme.card, borderColor: theme.border}}><h3 className="font-black">{cur?.name}</h3><p className="text-xs opacity-60">{cur?.zip} · Kansas City, MO</p><div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-xl p-3 text-center" style={{backgroundColor: theme.input}}><b className="text-lg">{cur?.member_count}</b><p className="text-xs">NEIGHBORS</p></div><div className="rounded-xl p-3 text-center" style={{backgroundColor: theme.input}}><b className="text-lg">{scopedPosts.length}</b><p className="text-xs">{scope==='kc'?'KC POSTS':'LOCAL POSTS'}</p></div></div></aside>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-[24px] w-full max-w-sm p-5 border max-h-[80vh] overflow-y-auto" style={{backgroundColor: '#15181f', borderColor: '#262a33'}}>
            <div className="flex justify-between items-center mb-4"><h2 className="font-black text-white">Settings • Themes</h2><button onClick={()=>setShowSettings(false)} className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">✕</button></div>
            <p className="text-[10px] font-black tracking-widest uppercase text-white/40 mb-2">KC themes</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {['royals','chiefs','sporting','kc-night','kc-sunset'].map(id=>{ const t=THEMES[id]; const active=themeId===id; return <button key={id} onClick={()=>setTheme(id)} className="rounded-2xl p-3 text-left border-2 text-sm font-bold min-h-16" style={{backgroundColor:t.card,borderColor:active?'#fff':t.border,color:t.text}}><span>{t.emoji} {t.name}</span>{active&&<span className="block text-[10px] mt-1 opacity-60">Active</span>}</button>})}
            </div>
            <p className="text-[10px] font-black tracking-widest uppercase text-white/40 mb-2">Other looks</p>
            <div className="grid grid-cols-2 gap-2">
              {['daylight','midnight','space','warm-sand','aim','pip-boy'].map(id=>{ const t=THEMES[id]; const active=themeId===id; return <button key={id} onClick={()=>setTheme(id)} className="rounded-2xl p-3 text-left border-2 text-sm font-bold min-h-16" style={{backgroundColor:t.card,borderColor:active?'#fff':t.border,color:t.text}}><span>{t.emoji} {t.name}</span>{active&&<span className="block text-[10px] mt-1 opacity-60">Active</span>}</button>})}
            </div>
            <button onClick={()=>setShowSettings(false)} className="mt-4 w-full py-3 rounded-full bg-white text-black font-bold">Done</button>
          </div>
        </div>
      )}

      {postSuccess && <div role="dialog" aria-modal="true" aria-label="Post published" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
  <div className="w-full max-w-xs rounded-3xl p-6 shadow-2xl border text-center" style={{backgroundColor:theme.card,color:theme.text,borderColor:theme.border}}>
    <div className="text-4xl mb-2">✓</div>
    <h2 className="font-black text-xl">Post published</h2>
    <p className="text-sm opacity-60 mt-1">Your post is now on Neighborly KC.</p>
    <button onClick={()=>setPostSuccess(false)} className="mt-5 w-full rounded-full py-3 font-bold" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>Done</button>
  </div>
</div>}

      {showJoin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="rounded-[28px] w-full max-w-sm p-6 shadow-2xl border" style={{backgroundColor: theme.card, borderColor: theme.border}}>
            <h2 className="font-black text-xl">Join {cur?.name}</h2><p className="text-xs opacity-60">{theme.id==='royals'? 'THE K • 64155 • ROYALS BLUE & WHITE' : theme.id==='chiefs'? 'ARROWHEAD • CHIEFS KINGDOM' : '40 mile radius KC network'}</p>
            <button onClick={signInWithGoogle} disabled={googleLoading} className="mt-5 w-full bg-white border-2 border-black text-black py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2">{googleLoading? 'Redirecting...' : 'Continue with Google'}</button>
            <div className="flex items-center gap-3 my-5"><div className="h-px flex-1 bg-black/10"></div><span className="text-xs font-bold opacity-30">OR</span><div className="h-px flex-1 bg-black/10"></div></div>
            <form onSubmit={e=>{e.preventDefault(); const pr={full_name:name,email,street_address:addr,zip:cur?.zip,neighborhood_id:cur?.id}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false);}} className="space-y-3">
              <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-4 py-3 text-sm outline-none"/>
              <input required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#f8f5ee] border rounded-xl px-4 py-3 text-sm outline-none"/>
              <input required value={addr} onChange={e=>setAddr(e.target.value)} placeholder={`Address in ${cur?.zip}`} className="w-full bg-[#f8f5ee] border rounded-xl px-4 py-3 text-sm outline-none"/>
              <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3.5 rounded-full font-bold text-sm">Cancel</button><button className="flex-1 text-white py-3.5 rounded-full font-bold text-sm" style={{backgroundColor: theme.accent}}>Join</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
