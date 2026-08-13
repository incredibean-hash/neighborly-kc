'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const THEMES: Record<string, any> = {
  midnight: { id:'midnight', name:'Midnight', emoji:'🌙', bg:'#070a0f', card:'#15181f', text:'#e8e8e8', subtext:'#8a8f98', accent:'#ffffff', border:'#262a33', input:'#1c1f28', header:'#0a0d14', pillActive:'#ffffff', pillTextActive:'#000', pillInactive:'#1c1f28' },
  daylight: { id:'daylight', name:'Daylight', emoji:'☀️', bg:'#f8f5ee', card:'#ffffff', text:'#1a3a2f', subtext:'#8a9a92', accent:'#1a3a2f', border:'#e8e0d0', input:'#f1ede6', header:'#1a3a2f', pillActive:'#1a3a2f', pillTextActive:'#fff', pillInactive:'#ffffff' },
  'kc-blue': { id:'kc-blue', name:'KC Blue', emoji:'💙', bg:'#0a1931', card:'#12315f', text:'#d6e6ff', subtext:'#7aa2d6', accent:'#3b9bff', border:'#1a3d75', input:'#0f2749', header:'#081428', pillActive:'#1854a3', pillTextActive:'#fff', pillInactive:'#12315f' },
  'warm-sand': { id:'warm-sand', name:'Warm Sand', bg:'#f2eadc', card:'#fffaf2', text:'#4a3f35', subtext:'#9a8d7e', accent:'#8b7355', border:'#e5d9c5', input:'#ece3d3', header:'#4a3f35', pillActive:'#8b7355', pillTextActive:'#fff', pillInactive:'#fffaf2' },
  aim: { id:'aim', name:'AIM', bg:'#fef9d6', card:'#ffffff', text:'#2a2a2a', subtext:'#9a9a6a', accent:'#ffcc00', border:'#f5e88a', input:'#fef6b5', header:'#ffcc00', pillActive:'#ffcc00', pillTextActive:'#000', pillInactive:'#ffffff' },
  'pip-boy': { id:'pip-boy', name:'Pip-Boy 3000', bg:'#000b00', card:'#0a1f0a', text:'#1aff61', subtext:'#3d9e5a', accent:'#1aff61', border:'#1aff6140', input:'#0f2f15', header:'#000b00', pillActive:'#1aff61', pillTextActive:'#000', pillInactive:'#0a1f0a', glow:'0 0 8px #1aff6166' },
  chiefs: { id:'chiefs', name:'KC Chiefs', emoji:'🏈', bg:'#0a0000', card:'#1a0a0a', text:'#ffffff', subtext:'#ff9a9a', accent:'#E31837', border:'#E3183740', input:'#2a0a0a', header:'#000000', pillActive:'#E31837', pillTextActive:'#FFB81C', pillInactive:'#1a0a0a' },
  royals: { id:'royals', name:'KC Royals', emoji:'👑', bg:'#f0f6ff', card:'#ffffff', text:'#00205a', subtext:'#6b8ab5', accent:'#004687', border:'#c2d5f0', input:'#e6eefb', header:'#004687', pillActive:'#004687', pillTextActive:'#ffffff', pillInactive:'#ffffff' },
  sporting: { id:'sporting', name:'Sporting KC', emoji:'⚽', bg:'#070f1f', card:'#0C2340', text:'#93B1D7', subtext:'#5a7fb5', accent:'#93B1D7', border:'#93B1D740', input:'#0a1a30', header:'#070f1f', pillActive:'#93B1D7', pillTextActive:'#0C2340', pillInactive:'#0C2340' },
};
const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];



async function compressImage(file: File): Promise<File> {
  const img = document.createElement('img');
  const canvas = document.createElement('canvas');
  const dataUrl = await new Promise<string>((r)=>{ const reader = new FileReader(); reader.onload=()=>r(reader.result as string); reader.readAsDataURL(file); });
  await new Promise<void>((res)=>{ img.onload=()=>res(); img.src=dataUrl; });
  const max=1200; let {width,height}=img;
  if(width>max||height>max){ if(width>height){ height=height*max/width; width=max; } else { width=width*max/height; height=max; } }
  canvas.width=width; canvas.height=height; canvas.getContext('2d')!.drawImage(img,0,0,width,height);
  const blob = await new Promise<Blob>((res)=>canvas.toBlob((b)=>res(b as Blob), 'image/jpeg', 0.7));
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {type:'image/jpeg'});
}

export default function Page(){
  const [hoods,setHoods]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [comments,setComments]=useState<Record<string,any[]>>({});
  const [likes,setLikes]=useState<Record<string,any[]>>({});
  const [cLikes,setCLikes]=useState<Record<string,any[]>>({});
  const [openComments,setOpenComments]=useState<Record<string,boolean>>({});
  const [commentText,setCommentText]=useState<Record<string,string>>({});
  const [hood,setHood]=useState('parkwood-hills');
  const [cat,setCat]=useState('All');
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [themeId,setThemeId]=useState('pip-boy');
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [addr,setAddr]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [googleLoading,setGoogleLoading]=useState(false);

  const theme = THEMES[themeId] || THEMES['pip-boy'];

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
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if(error){ alert('Google login failed: '+error.message); setGoogleLoading(false); }
  };

  useEffect(()=>{
    const saved = localStorage.getItem('nkc_theme'); if(saved && THEMES[saved]) setThemeId(saved);
    (async()=>{
      const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false}); if(h) setHoods(h);
      const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(50); if(p){ setPosts(p); loadAll(p.map((x:any)=>x.id)); }
      const { data: { session } } = await supabase.auth.getSession();
      if(session?.user){ const u=session.user; const pr={full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Neighbor', email: u.email, avatar: u.user_metadata?.avatar_url, google_id: u.id}; localStorage.setItem('nkc_profile', JSON.stringify(pr)); setProfile(pr); }
      else { const s=localStorage.getItem('nkc_profile'); if(s) try{setProfile(JSON.parse(s))}catch{} }
      supabase.auth.onAuthStateChange((_, sess)=>{ if(sess?.user){ const u=sess.user; const pr={full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Neighbor', email: u.email, avatar: u.user_metadata?.avatar_url, google_id: u.id}; localStorage.setItem('nkc_profile', JSON.stringify(pr)); setProfile(pr); setShowJoin(false); } });
    })()
  },[]);

  const setTheme = (id:string)=>{ setThemeId(id); localStorage.setItem('nkc_theme', id); };
  const cur = hoods.find((x:any)=>x.slug===hood) || hoods[0] || {name:'Parkwood Hills', zip:'64155', id: null, slug:'parkwood-hills', member_count: 247};
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);
  const isAdmin = profile?.full_name?.toLowerCase().includes('jason');

  const handlePost = async () => {
    if(!profile) return setShowJoin(true); if(!body.trim() &&!file) return; if(file && file.size > 3*1024*1024){ alert('Max 3MB!'); return; }
    setUploading(true);
    try{
      let image_url: string | null = null;
      if(file){ const compressed=await compressImage(file); const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`; const {error: upErr}=await supabase.storage.from('post-images').upload(path, compressed); if(upErr) throw upErr; const {data}=supabase.storage.from('post-images').getPublicUrl(path); image_url=data.publicUrl; }
      const realId = hoods.find((x:any)=>x.slug===hood)?.id || cur?.id;
      const { data, error } = await supabase.from('posts').insert({ body, category: cat==='All'? 'General' : cat, neighborhood_id: realId, image_url }).select().single(); if(error) throw error;
      setPosts([{...data, profiles:{full_name:profile.full_name}},...posts]); setBody(''); setFile(null); const el = document.getElementById('file-input') as HTMLInputElement; if(el) el.value='';
    } catch(e:any){ alert('Could not save: '+(e.message||e)); } finally{ setUploading(false); }
  };

  const addComment = async (postId:string) => { if(!profile) return setShowJoin(true); const text=commentText[postId]?.trim(); if(!text) return; const {data, error}=await supabase.from('comments').insert({ post_id: postId, content:text, body:text, author_name:profile.full_name }).select().single(); if(error) return alert(error.message); setComments((prev)=> ({...prev, [postId]: [data,...(prev[postId]||[])]})); setCommentText((prev)=>({...prev,[postId]:''})); };
  const togglePostLike = async (postId:string) => { if(!profile) return setShowJoin(true); const list = likes[postId]||[]; const myLike = list.find((l:any)=>l.author_name===profile.full_name); if(myLike){ await supabase.from('likes').delete().eq('id', myLike.id); setLikes((prev)=>{ const next = {...prev}; next[postId]=prev[postId].filter((x:any)=>x.id!==myLike.id); return next; }); } else { const {data}=await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name}).select().single(); if(data){ setLikes((prev)=>{ const next = {...prev}; next[postId]=[...(prev[postId]||[]), data]; return next; }); } } };
  const toggleCommentLike = async (commentId:string) => { if(!profile) return setShowJoin(true); const list = cLikes[commentId]||[]; const myLike = list.find((l:any)=>l.author_name===profile.full_name); if(myLike){ await supabase.from('likes').delete().eq('id', myLike.id); setCLikes((prev)=>{ const next={...prev}; next[commentId]=prev[commentId].filter((x:any)=>x.id!==myLike.id); return next; }); } else { const {data}=await supabase.from('likes').insert({comment_id:commentId, author_name:profile.full_name}).select().single(); if(data){ setCLikes((prev)=>{ const next={...prev}; next[commentId]=[...(prev[commentId]||[]), data]; return next; }); } } };
  const deletePost = async (id:string, image_url:string|null) => { if(!confirm('Delete this post?')) return; if(image_url){ const path = image_url.split('/post-images/')[1]; if(path) await supabase.storage.from('post-images').remove([path]); } await supabase.from('posts').delete().eq('id', id); setPosts(posts.filter((p:any)=>p.id!==id)); };
  const deleteComment = async (id:string, postId:string) => { if(!confirm('Delete comment?')) return; await supabase.from('comments').delete().eq('id', id); setComments((prev)=>({...prev, [postId]: prev[postId].filter((c:any)=>c.id!==id)})); };

  return (
    <div className="min-h-screen" style={{backgroundColor: theme.bg, color: theme.text}}>
      <header className="sticky top-0 z-40 border-b" style={{backgroundColor: theme.header, borderColor: theme.border}}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div><h1 className="font-black text-xl tracking-tight text-white" style={{color: '#fff'}}>Neighborly KC</h1><p className="text-xs -mt-1 text-white/60">Kansas City • 40 Mile Radius</p></div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowSettings(true)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: theme.card, border: `1px solid ${theme.border}`}}>⚙️</button>
            {profile? <><span className="text-xs hidden sm:block opacity-60">{profile.full_name}</span><button onClick={()=>{localStorage.removeItem('nkc_profile'); supabase.auth.signOut(); setProfile(null);}} className="px-3 py-1.5 rounded-full text-xs font-bold" style={{backgroundColor: theme.card, color: theme.text, border: `1px solid ${theme.border}`}}>Sign out</button></> : <button onClick={()=>setShowJoin(true)} className="px-4 py-2 rounded-full text-sm font-black" style={{backgroundColor: theme.pillActive, color: theme.pillTextActive}}>Join / Sign in</button>}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-3 flex gap-2 justify-center flex-wrap">
          {['Feed','Safety','For Sale'].map(t=>{ const active = (cat==='All' && t==='Feed') || (t==='Safety' && cat==='Safety Alert') || (t==='For Sale' && cat==='For Sale & Free'); return (<button key={t} onClick={()=>{ if(t==='Feed') setCat('All'); if(t==='Safety') setCat('Safety Alert'); if(t==='For Sale') setCat('For Sale & Free'); }} className="px-4 py-1.5 rounded-full text-sm font-bold" style={{backgroundColor: active? theme.pillActive : theme.pillInactive, color: active? theme.pillTextActive : theme.text, border: `1px solid ${theme.border}`}}>{t}</button>)})}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-6">
        <aside className="rounded-2xl p-3 h-fit border hidden lg:block" style={{backgroundColor: theme.card, borderColor: theme.border}}><p className="text-xs font-bold px-3 py-2 opacity-40">FILTER</p>{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className="w-full text-left px-3 py-2.5 rounded-xl text-sm" style={{backgroundColor: cat===c? theme.accent : 'transparent', color: cat===c? theme.pillTextActive : theme.text}}>{c}</button>)}</aside>

        <main className="space-y-3">
          <div className="rounded-2xl p-4 border" style={{backgroundColor: theme.card, borderColor: theme.border}}><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur?.name}?`:'Join Parkwood Hills to post...'} className="w-full rounded-xl p-3 min-h-[80px] text-sm outline-none" style={{backgroundColor: theme.input, color: theme.text, border: `1px solid ${theme.border}`}} /><div className="flex items-center gap-2 mt-3"><input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs" />{file && <span className="text-xs opacity-60">{(file.size/1024).toFixed(0)}KB</span>}</div><div className="flex justify-end mt-2"><button disabled={uploading} onClick={handlePost} className="px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50" style={{backgroundColor: theme.accent, color: theme.pillTextActive}}>{uploading?'Uploading...':'Post to neighbors'}</button></div></div>

          {filtered.map((p:any)=>{ const cList=comments[p.id]||[]; const isOpen=openComments[p.id]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_name===profile?.full_name); const isOwner = profile && (p.profiles?.full_name===profile.full_name || p.author_name===profile.full_name); const canDelete = isOwner || isAdmin; return (
            <div key={p.id} className="rounded-2xl p-4 border" style={{backgroundColor: theme.card, borderColor: theme.border}}><div className="flex justify-between"><p className="text-xs font-bold opacity-60">{p.profiles?.full_name||p.author_name||'Neighbor'} · {p.category}</p>{canDelete && <button onClick={()=>deletePost(p.id,p.image_url)} className="text-xs opacity-40 hover:text-red-600">🗑️ Delete</button>}</div><p className="mt-1 whitespace-pre-wrap">{p.body || p.content}</p>{p.image_url && <img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[400px] w-full object-cover border" style={{borderColor: theme.border}} />}<p className="text-xs opacity-40 mt-2">{new Date(p.created_at).toLocaleString()}</p><div className="mt-3 pt-3 border-t flex gap-4" style={{borderColor: theme.border}}><button onClick={()=>togglePostLike(p.id)} className="text-xs font-bold">{liked?'❤️':'🤍'} {pLikes.length}</button><button onClick={()=>setOpenComments((prev)=>({...prev,[p.id]:!prev[p.id]}))} className="text-xs font-bold opacity-60">💬 {cList.length} {isOpen?'▲':'▼'}</button></div>{isOpen && (<div className="mt-3 rounded-xl p-3 space-y-2" style={{backgroundColor: theme.input}}>{cList.map((c:any)=>{ const cl=cLikes[c.id]||[]; const cliked=cl.some((l:any)=>l.author_name===profile?.full_name); const canDelC = (profile && c.author_name===profile.full_name) || isAdmin; return (<div key={c.id} className="text-sm rounded-lg p-2 flex justify-between gap-2" style={{backgroundColor: theme.card}}><div><b className="text-xs">{c.author_name}:</b> {c.content||c.body} <button onClick={()=>toggleCommentLike(c.id)} className="ml-3 text-xs">{cliked?'❤️':'🤍'} {cl.length}</button></div>{canDelC && <button onClick={()=>deleteComment(c.id,p.id)} className="text-[10px] opacity-30">🗑️</button>}</div>);})}<div className="flex gap-2 pt-2"><input value={commentText[p.id]||''} onChange={e=>setCommentText((prev)=>({...prev,[p.id]:e.target.value}))} placeholder="Add a comment..." className="flex-1 border rounded-full px-3 py-2 text-sm outline-none" style={{backgroundColor: theme.card, borderColor: theme.border, color: theme.text}} /><button onClick={()=>addComment(p.id)} className="px-4 py-2 rounded-full text-xs font-bold" style={{backgroundColor: theme.accent, color: theme.pillTextActive}}>Reply</button></div></div>)}</div>
          )})}
        </main>

        <aside className="rounded-2xl p-5 border h-fit" style={{backgroundColor: theme.card, borderColor: theme.border}}><h3 className="font-black">{cur?.name}</h3><p className="text-xs opacity-60">{cur?.zip} · Kansas City, MO</p><div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-xl p-3 text-center" style={{backgroundColor: theme.input}}><b className="text-lg">{cur?.member_count}</b><p className="text-xs">NEIGHBORS</p></div><div className="rounded-xl p-3 text-center" style={{backgroundColor: theme.input}}><b className="text-lg">{posts.length}</b><p className="text-xs">POSTS</p></div></div></aside>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-[24px] w-full max-w-sm p-5 border max-h-[80vh] overflow-y-auto" style={{backgroundColor: '#15181f', borderColor: '#262a33'}}>
            <div className="flex justify-between items-center mb-4"><h2 className="font-black text-white">Settings • Themes</h2><button onClick={()=>setShowSettings(false)} className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">✕</button></div>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(THEMES).map((t:any)=>{ const active = themeId===t.id; return (<button key={t.id} onClick={()=>setTheme(t.id)} className="rounded-2xl p-3 text-left border-2 text-sm font-bold flex flex-col gap-2" style={{backgroundColor: t.card, borderColor: active? '#fff' : t.border, color: t.text}}><span>{t.name} {t.emoji}</span></button>)})}
            </div>
            <button onClick={()=>setShowSettings(false)} className="mt-4 w-full py-3 rounded-full bg-white text-black font-bold">Done</button>
          </div>
        </div>
      )}

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
