'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];

async function compressImage(file: File): Promise<File> {
  const img = document.createElement('img');
  const canvas = document.createElement('canvas');
  const dataUrl = await new Promise<string>((r)=>{
    const reader = new FileReader();
    reader.onload=()=>r(reader.result as string);
    reader.readAsDataURL(file);
  });
  await new Promise<void>((res)=>{ img.onload=()=>res(); img.src=dataUrl; });
  const max=1200;
  let {width,height}=img;
  if(width>max||height>max){
    if(width>height){ height=height*max/width; width=max; }
    else { width=width*max/height; height=max; }
  }
  canvas.width=width; canvas.height=height;
  canvas.getContext('2d')!.drawImage(img,0,0,width,height);
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
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [addr,setAddr]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [googleLoading,setGoogleLoading]=useState(false);

  const loadAll = async (postIds:string[]) => {
    if(!postIds.length) return;
    const {data:com}=await supabase.from('comments').select('*').in('post_id', postIds).order('created_at',{ascending:false});
    if(com){
      const g: Record<string,any[]> = {};
      com.forEach((c:any)=>{ if(!g[c.post_id]) g[c.post_id]=[]; g[c.post_id].push(c); });
      setComments(g);
      const cIds=com.map((c:any)=>c.id);
      if(cIds.length){
        const {data:cl}=await supabase.from('likes').select('*').in('comment_id', cIds);
        if(cl){
          const cg: Record<string,any[]> = {};
          cl.forEach((l:any)=>{ if(!cg[l.comment_id]) cg[l.comment_id]=[]; cg[l.comment_id].push(l); });
          setCLikes(cg);
        }
      }
    }
    const {data:lk}=await supabase.from('likes').select('*').in('post_id', postIds).is('comment_id', null);
    if(lk){
      const lg: Record<string,any[]> = {};
      lk.forEach((l:any)=>{ if(!lg[l.post_id]) lg[l.post_id]=[]; lg[l.post_id].push(l); });
      setLikes(lg);
    }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if(error){ alert('Google login failed: '+error.message); setGoogleLoading(false); }
  };

  useEffect(()=>{ (async()=>{
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false});
    if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(50);
    if(p){ setPosts(p); loadAll(p.map((x:any)=>x.id)); }
    const { data: { session } } = await supabase.auth.getSession();
    if(session?.user){
      const u=session.user;
      const pr={full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Neighbor', email: u.email, avatar: u.user_metadata?.avatar_url, google_id: u.id};
      localStorage.setItem('nkc_profile', JSON.stringify(pr));
      setProfile(pr);
    } else {
      const s=typeof window!=='undefined'? localStorage.getItem('nkc_profile'):null;
      if(s) setProfile(JSON.parse(s));
    }
    supabase.auth.onAuthStateChange((event, sess)=>{
      if(sess?.user){
        const u=sess.user;
        const pr={full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Neighbor', email: u.email, avatar: u.user_metadata?.avatar_url, google_id: u.id};
        localStorage.setItem('nkc_profile', JSON.stringify(pr));
        setProfile(pr);
        setShowJoin(false);
      }
    });
  })() },[]);

  const cur = hoods.find((x:any)=>x.slug===hood) || hoods[0] || {name:'Parkwood Hills', zip:'64155', id: null, slug:'parkwood-hills', member_count: 247};
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);
  const isAdmin = profile?.full_name?.toLowerCase().includes('jason');

  const handlePost = async () => {
    if(!profile) return setShowJoin(true);
    if(!body.trim() &&!file) return;
    if(file && file.size > 3*1024*1024){ alert('Max 3MB!'); return; }
    setUploading(true);
    try{
      let image_url: string | null = null;
      if(file){
        const compressed=await compressImage(file);
        const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const {error: upErr}=await supabase.storage.from('post-images').upload(path, compressed);
        if(upErr) throw upErr;
        const {data}=supabase.storage.from('post-images').getPublicUrl(path);
        image_url=data.publicUrl;
      }
      const realId = hoods.find((x:any)=>x.slug===hood)?.id || cur?.id;
      const { data, error } = await supabase.from('posts').insert({ body, category: cat==='All'? 'General' : cat, neighborhood_id: realId, image_url }).select().single();
      if(error) throw error;
      setPosts([{...data, profiles:{full_name:profile.full_name}},...posts]);
      setBody('');
      setFile(null);
      const el = document.getElementById('file-input') as HTMLInputElement;
      if(el) el.value='';
    } catch(e:any){ alert('Could not save: '+(e.message||e)); } finally{ setUploading(false); }
  };

  const addComment = async (postId:string) => {
    if(!profile) return setShowJoin(true);
    const text=commentText[postId]?.trim();
    if(!text) return;
    const {data, error}=await supabase.from('comments').insert({ post_id: postId, content:text, body:text, author_name:profile.full_name }).select().single();
    if(error) return alert(error.message);
    setComments((prev)=> ({...prev, [postId]: [data,...(prev[postId]||[])]}));
    setCommentText((prev)=>({...prev,[postId]:''}));
  };

  const togglePostLike = async (postId:string) => {
    if(!profile) return setShowJoin(true);
    const list = likes[postId]||[];
    const myLike = list.find((l:any)=>l.author_name===profile.full_name);
    if(myLike){
      await supabase.from('likes').delete().eq('id', myLike.id);
      setLikes((prev)=>{ const next = {...prev}; next[postId]=prev[postId].filter((x:any)=>x.id!==myLike.id); return next; });
    } else {
      const {data}=await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name}).select().single();
      if(data){ setLikes((prev)=>{ const next = {...prev}; next[postId]=[...(prev[postId]||[]), data]; return next; }); }
    }
  };
  const toggleCommentLike = async (commentId:string) => {
    if(!profile) return setShowJoin(true);
    const list = cLikes[commentId]||[];
    const myLike = list.find((l:any)=>l.author_name===profile.full_name);
    if(myLike){
      await supabase.from('likes').delete().eq('id', myLike.id);
      setCLikes((prev)=>{ const next={...prev}; next[commentId]=prev[commentId].filter((x:any)=>x.id!==myLike.id); return next; });
    } else {
      const {data}=await supabase.from('likes').insert({comment_id:commentId, author_name:profile.full_name}).select().single();
      if(data){ setCLikes((prev)=>{ const next={...prev}; next[commentId]=[...(prev[commentId]||[]), data]; return next; }); }
    }
  };
  const deletePost = async (id:string, image_url:string|null) => {
    if(!confirm('Delete this post?')) return;
    if(image_url){ const path = image_url.split('/post-images/')[1]; if(path) await supabase.storage.from('post-images').remove([path]); }
    await supabase.from('posts').delete().eq('id', id);
    setPosts(posts.filter((p:any)=>p.id!==id));
  };
  const deleteComment = async (id:string, postId:string) => {
    if(!confirm('Delete comment?')) return;
    await supabase.from('comments').delete().eq('id', id);
    setComments((prev)=>({...prev, [postId]: prev[postId].filter((c:any)=>c.id!==id)}));
  };

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#1a3a2f]">
      <header className="bg-[#1a3a2f] text-white sticky top-0 z-40"><div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between"><div><h1 className="font-black text-xl tracking-tight">Neighborly KC</h1><p className="text-xs opacity-60 -mt-1">Kansas City • 40 Mile Radius</p></div><div className="flex items-center gap-2">{profile? <><span className="text-xs opacity-80 hidden sm:block">{profile.full_name}</span><button onClick={()=>{localStorage.removeItem('nkc_profile'); supabase.auth.signOut(); setProfile(null);}} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-xs font-bold">Sign out</button></> : <button onClick={()=>setShowJoin(true)} className="bg-white text-[#1a3a2f] px-4 py-2 rounded-full text-sm font-black">Join / Sign in</button>}</div></div></header>
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-6">
        <aside className="bg-white rounded-2xl p-3 h-fit border hidden lg:block"><p className="text-xs font-bold opacity-40 px-3 py-2">FILTER</p>{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${cat===c?'bg-[#1a3a2f] text-white':'hover:bg-black/5'}`}>{c}</button>)}</aside>
        <main className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border"><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur?.name}?`:'Join Parkwood Hills to post...'} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[80px] text-sm outline-none" /><div className="flex items-center gap-2 mt-3"><input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs" />{file && <span className="text-xs opacity-60">{(file.size/1024).toFixed(0)}KB → ~400KB</span>}</div><div className="flex justify-end mt-2"><button disabled={uploading} onClick={handlePost} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50">{uploading?'Uploading...':'Post to neighbors'}</button></div></div>
          {filtered.map((p:any)=>{ const cList=comments[p.id]||[]; const isOpen=openComments[p.id]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_name===profile?.full_name); const isOwner = profile && (p.profiles?.full_name===profile.full_name || p.author_name===profile.full_name); const canDelete = isOwner || isAdmin; return (<div key={p.id} className="bg-white rounded-2xl p-4 border"><div className="flex justify-between"><p className="text-xs font-bold opacity-60">{p.profiles?.full_name||p.author_name||'Neighbor'} · {p.category}</p>{canDelete && <button onClick={()=>deletePost(p.id,p.image_url)} className="text-xs opacity-40 hover:text-red-600">🗑️ Delete</button>}</div><p className="mt-1 whitespace-pre-wrap">{p.body || p.content}</p>{p.image_url && <img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[400px] w-full object-cover border" />}<p className="text-xs opacity-40 mt-2">{new Date(p.created_at).toLocaleString()}</p><div className="mt-3 pt-3 border-t flex gap-4"><button onClick={()=>togglePostLike(p.id)} className={`text-xs font-bold ${liked?'text-red-600':'opacity-60 hover:opacity-100'}`}>{liked?'❤️':'🤍'} {pLikes.length}</button><button onClick={()=>setOpenComments((prev)=>({...prev,[p.id]:!prev[p.id]}))} className="text-xs font-bold hover:underline opacity-60">💬 {cList.length} {isOpen?'▲':'▼'}</button></div>{isOpen && (<div className="mt-3 bg-[#f8f5ee] rounded-xl p-3 space-y-2">{cList.map((c:any)=>{ const cl=cLikes[c.id]||[]; const cliked=cl.some((l:any)=>l.author_name===profile?.full_name); const canDelC = (profile && c.author_name===profile.full_name) || isAdmin; return (<div key={c.id} className="text-sm bg-white rounded-lg p-2 flex justify-between gap-2"><div><b className="text-xs">{c.author_name}:</b> {c.content||c.body} <span className="text-[10px] opacity-40 ml-2">{new Date(c.created_at).toLocaleTimeString()}</span><button onClick={()=>toggleCommentLike(c.id)} className={`ml-3 text-xs ${cliked?'text-red-600':'opacity-50'}`}>{cliked?'❤️':'🤍'} {cl.length}</button></div>{canDelC && <button onClick={()=>deleteComment(c.id,p.id)} className="text-[10px] opacity-30 hover:text-red-600">🗑️</button>}</div>);})}<div className="flex gap-2 pt-2"><input value={commentText[p.id]||''} onChange={e=>setCommentText((prev)=>({...prev,[p.id]:e.target.value}))} placeholder={profile?'Add a comment...':'Join to comment'} className="flex-1 bg-white border rounded-full px-3 py-2 text-sm outline-none" /><button onClick={()=>addComment(p.id)} className="bg-[#1a3a2f] text-white px-4 py-2 rounded-full text-xs font-bold">Reply</button></div></div>)}</div>)})}
        </main>
        <aside className="bg-white rounded-2xl p-5 border h-fit"><h3 className="font-black">{cur?.name}</h3><p className="text-xs opacity-60">{cur?.zip} · Kansas City, MO</p><div className="grid grid-cols-2 gap-2 mt-4"><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{cur?.member_count}</b><p className="text-xs">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{posts.length}</b><p className="text-xs">POSTS</p></div></div></aside>
      </div>
      {showJoin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-2xl">
            <h2 className="font-black text-2xl">Join {cur?.name}</h2>
            <p className="text-sm opacity-60 mt-1">40 mile radius KC network</p>
            <button onClick={signInWithGoogle} disabled={googleLoading} className="mt-5 w-full bg-white border-2 border-black text-black py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-black hover:text-white transition">
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
              {googleLoading? 'Redirecting...' : 'Continue with Google'}
            </button>
            <div className="flex items-center gap-3 my-5"><div className="h-px flex-1 bg-black/10"></div><span className="text-xs font-bold opacity-30">OR</span><div className="h-px flex-1 bg-black/10"></div></div>
            <form onSubmit={e=>{e.preventDefault(); const pr={full_name:name,email,street_address:addr,zip:cur?.zip,neighborhood_id:cur?.id}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false);}} className="space-y-3">
              <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"/>
              <input required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#f8f5ee] border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"/>
              <input required value={addr} onChange={e=>setAddr(e.target.value)} placeholder={`Address in ${cur?.zip}`} className="w-full bg-[#f8f5ee] border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"/>
              <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3.5 rounded-full font-bold text-sm">Cancel</button><button className="flex-1 bg-[#1a3a2f] text-white py-3.5 rounded-full font-bold text-sm">Join with Email</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
