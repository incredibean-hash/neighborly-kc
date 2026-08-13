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
  const [hood,setHood]=useState('Meadow Brooks Heights');
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
      const {data:p}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(50); if(p){ setPosts(p); loadAll(p.map((x:any)=>x.id)); }
      const { data: { session } } = await supabase.auth.getSession();
      if(session?.user){ const u=session.user; const pr={full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Neighbor', email: u.email, avatar: u.user_metadata?.avatar_url, google_id: u.id}; localStorage.setItem('nkc_profile', JSON.stringify(pr)); setProfile(pr); }
      else { const s=localStorage.getItem('nkc_profile'); if(s) try{setProfile(JSON.parse(s))}catch{} }
      supabase.auth.onAuthStateChange((_, sess)=>{ if(sess?.user){ const u=sess.user; const pr={full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Neighbor', email: u.email, avatar: u.user_metadata?.avatar_url, google_id: u.id}; localStorage.setItem('nkc_profile', JSON.stringify(pr)); setProfile(pr); setShowJoin(false); } });
    })()
  },[]);

  const setTheme = (id:string)=>{ setThemeId(id); localStorage.setItem('nkc_theme', id); };
const cur = hoods.find((x:any)=>x.slug==hood) || hoods[0] || {name:'Meadow Brooks Heights', zip:'64155', id: '5fb249cb-1667-475b-ab8c-43e1df245ace', slug:'meadow-brooks-heights'};
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);
  const isAdmin = profile?.full_name?.toLowerCase().includes('jason');

 const handleBePost = async () => {
  if (!profile) return setShowJoin(true);
  if (!body.trim() && !file) return;
  setUploading(true);
  try {
    let image_url: string | null = null;
    if (file) {
      const compressed = await compressImage(file);
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error: upErr } = await supabase.storage.from('post-images').upload(path, compressed);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path);
      image_url = publicUrl;
    }
    const realId = hoods?.find((x: any) => x.slug == hood)?.id || cur?.id || '5fb249cb-1667-475b-ab8c-43e1df245ace';
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be signed in to post');
      setUploading(false);
      return;
    }
    const { data, error } = await supabase.from('posts').insert({
      body,
category: cat === 'All' ? 'General' : cat,      user_id: user.id,
      author_id: user.id,
      neighborhood_id: realId,
      image_url,
      author_name: profile?.full_name || 'Neighbor'
    }).select().single();

    if (error) throw error;
    setPosts([{ ...data, profiles: { full_name: profile.full_name } }, ...posts]);
    setBody('');
    setFile(null);
  } catch (e: any) {
    alert('Could not save: ' + (e.message || e));
  } finally {
    setUploading(false);
  }
}; 
