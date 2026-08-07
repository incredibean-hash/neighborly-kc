'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];
async function compressImage(file: File): Promise<File> {
  const img = document.createElement('img'); const canvas = document.createElement('canvas');
  const dataUrl = await new Promise<string>(r=>{ const reader=new FileReader(); reader.onload=()=>r(reader.result as string); reader.readAsDataURL(file); });
  await new Promise<void>(res=>{ img.onload=()=>res(); img.src=dataUrl; });
  const max=1200; let {width,height}=img; if(width>max||height>max){ if(width>height){height=height*max/width;width=max;} else {width=width*max/height;height=max;}}
  canvas.width=width; canvas.height=height; canvas.getContext('2d')!.drawImage(img,0,0,width,height);
  const blob = await new Promise<Blob>(res=>canvas.toBlob(b=>res(b!), 'image/jpeg', 0.7));
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {type:'image/jpeg'});
}
export default function Page(){
  const [hoods,setHoods]=useState<any[]>([]); const [posts,setPosts]=useState<any[]>([]);
  const [comments,setComments]=useState<Record<string,any[]>>({}); const [likes,setLikes]=useState<Record<string,any[]>>({}); const [cLikes,setCLikes]=useState<Record<string,any[]>>({});
  const [openComments,setOpenComments]=useState<Record<string,boolean>>({}); const [commentText,setCommentText]=useState<Record<string,string>>({});
  const [hood,setHood]=useState('parkwood-hills'); const [cat,setCat]=useState('All'); const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null); const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [addr,setAddr]=useState('');
  const [file,setFile]=useState<File|null>(null); const [uploading,setUploading]=useState(false); const [showFilters,setShowFilters]=useState(false);
  const [showDM,setShowDM]=useState(false); const [threads,setThreads]=useState<any[]>([]); const [activeThread,setActiveThread]=useState<any>(null);
  const [dmMessages,setDmMessages]=useState<any[]>([]); const [dmInput,setDmInput]=useState(''); 
  const dmBottomRef=useRef<HTMLDivElement>(null); const dmInputRef=useRef<HTMLInputElement>(null);
  // PWA INSTALL - header only, auto-hide
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  useEffect(()=>{
    // hide if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if(isStandalone){ setShowInstall(false); return; }
    const handler = (e:any)=>{ e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    // For iOS where beforeinstallprompt doesn't fire, still show button for manual instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if(isIOS) setShowInstall(true);
    else {
      // show after 2 sec if not standalone, even if prompt hasn't fired yet (helps desktop)
      const t = setTimeout(()=>{ if(!isStandalone) setShowInstall(true); }, 2000);
      return ()=>{ clearTimeout(t); window.removeEventListener('beforeinstallprompt', handler); };
    }
    return ()=> window.removeEventListener('beforeinstallprompt', handler);
  },[]);
  useEffect(()=>{
    const onInstalled = ()=> setShowInstall(false);
    window.addEventListener('appinstalled', onInstalled);
    return ()=> window.removeEventListener('appinstalled', onInstalled);
  },[]);
  const handleInstall = async () => {
    if(deferredPrompt){
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if(outcome==='accepted') setShowInstall(false);
      setDeferredPrompt(null);
    } else {
      alert('To install:\n\niPhone: Tap Share (square + arrow) → Add to Home Screen → Add\n\nAndroid/Desktop: Tap 3 dots → Install App');
    }
  };

  const loadAll = async (postIds:string[]) => {
    if(!postIds.length) return;
    const {data:com}=await supabase.from('comments').select('*').in('post_id', postIds).order('created_at',{ascending:false});
    if(com){ const g: Record<string,any[]> = {}; com.forEach((c:any)=>{ if(!g[c.post_id]) g[c.post_id]=[]; g[c.post_id].push(c); }); setComments(g);
      const cIds=com.map((c:any)=>c.id);
      if(cIds.length){ const {data:cl}=await supabase.from('likes').select('*').in('comment_id', cIds); if(cl){ const cg: Record<string,any[]> = {}; cl.forEach((l:any)=>{ if(!cg[l.comment_id]) cg[l.comment_id]=[]; cg[l.comment_id].push(l); }); setCLikes(cg); } }
    }
    const {data:lk}=await supabase.from('likes').select('*').in('post_id', postIds).is('comment_id', null);
    if(lk){ const lg: Record<string,any[]> = {}; lk.forEach((l:any)=>{ if(!lg[l.post_id]) lg[l.post_id]=[]; lg[l.post_id].push(l); }); setLikes(lg); }
  };
  useEffect(()=>{ (async()=>{
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false}); if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(50);
    if(p){ setPosts(p); loadAll(p.map((x:any)=>x.id)); }
    const s=typeof window!=='undefined'? localStorage.getItem('nkc_profile'):null; if(s) setProfile(JSON.parse(s));
  })() },[]);
  const loadThreads = async () => {
    if(!profile) return;
    const {data}=await supabase.from('dm_threads').select('*').or(`user_a.eq.${profile.full_name},user_b.eq.${profile.full_name}`).order('last_message_at',{ascending:false});
    if(data) setThreads(data);
  };
  useEffect(()=>{ if(profile) loadThreads(); },[profile, showDM]);
  useEffect(()=>{ dmBottomRef.current?.scrollIntoView({behavior:'smooth'}); },[dmMessages]);
  useEffect(()=>{ if(showDM && activeThread) setTimeout(()=>dmInputRef.current?.focus(), 300); },[activeThread, showDM]);
  const cur = hoods.find((x:any)=>x.slug===hood) || hoods[0] || {name:'Parkwood Hills', zip:'64155', id: null, slug:'parkwood-hills', member_count: 247};
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);
  const isAdmin = profile?.full_name?.toLowerCase().includes('jason');
  const handlePost = async () => {
    if(!profile) return setShowJoin(true); if(!body.trim() &&!file) return;
    if(file && file.size > 3*1024*1024){ alert('Max 3MB!'); return; }
    setUploading(true);
    try{
      let image_url: string | null = null;
      if(file){ const compressed=await compressImage(file); const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const {error: upErr}=await supabase.storage.from('post-images').upload(path, compressed); if(upErr) throw upErr;
        const {data}=supabase.storage.from('post-images').getPublicUrl(path); image_url=data.publicUrl;
      }
      const realId = hoods.find((x:any)=>x.slug===hood)?.id || cur?.id;
      const { data, error } = await supabase.from('posts').insert({ body, category: cat==='All'? 'General' : cat, neighborhood_id: realId, image_url, author_name: profile.full_name }).select().single();
      if(error) throw error; setPosts([{...data, profiles:{full_name:profile.full_name}},...posts]); setBody(''); setFile(null);
      const el = document.getElementById('file-input') as HTMLInputElement; if(el) el.value='';
    } catch(e:any){ alert('Could not save: '+(e.message||e)); } finally{ setUploading(false); }
  };
  const addComment = async (postId:string) => {
    if(!profile) return setShowJoin(true); const text=commentText[postId]?.trim(); if(!text) return;
    const {data, error}=await supabase.from('comments').insert({ post_id: postId, content:text, body:text, author_name:profile.full_name }).select().single();
    if(error) return alert(error.message);
    setComments((prev)=> ({...prev, [postId]: [data,...(prev[postId]||[])]})); setCommentText((prev)=>({...prev,[postId]:''}));
  };
  const togglePostLike = async (postId:string) => {
    if(!profile) return setShowJoin(true); const list = likes[postId]||[]; const myLike = list.find((l:any)=>l.author_name===profile.full_name);
    if(myLike){ await supabase.from('likes').delete().eq('id', myLike.id); setLikes((prev)=>{ const next={...prev}; next[postId]=prev[postId].filter((x:any)=>x.id!==myLike.id); return next; }); }
    else { const {data}=await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name}).select().single(); if(data){ setLikes((prev)=>{ const next={...prev}; next[postId]=[...(prev[postId]||[]), data]; return next; }); } }
  };
  const toggleCommentLike = async (cId:string) => {
    if(!profile) return setShowJoin(true); const list = cLikes[cId]||[]; const myLike = list.find((l:any)=>l.author_name===profile.full_name);
    if(myLike){ await supabase.from('likes').delete().eq('id', myLike.id); setCLikes((prev)=>{ const next={...prev}; next[cId]=prev[cId].filter((x:any)=>x.id!==myLike.id); return next; }); }
    else { const {data}=await supabase.from('likes').insert({comment_id:cId, author_name:profile.full_name}).select().single(); if(data){ setCLikes((prev)=>{ const next={...prev}; next[cId]=[...(prev[cId]||[]), data]; return next; }); } }
  };
  const deletePost = async (id:string, image_url:string|null) => {
    if(!confirm('Delete this post?')) return; await supabase.from('posts').delete().eq('id', id);
    if(image_url){ const path=image_url.split('/post-images/')[1]; if(path) await supabase.storage.from('post-images').remove([path]); }
    setPosts(posts.filter((p:any)=>p.id!==id));
  };
  const deleteComment = async (cId:string, postId:string) => {
    if(!confirm('Delete comment?')) return; await supabase.from('comments').delete().eq('id', cId);
    setComments((prev)=>{ const next={...prev}; next[postId]=prev[postId].filter((x:any)=>x.id!==cId); return next; });
  };
  const startDM = async (otherName:string) => {
    if(!profile) return setShowJoin(true); 
    const cleanName = (otherName||'').trim();
    if(!cleanName || cleanName==='Neighbor') return alert('That user has no name saved yet');
    if(cleanName===profile.full_name) return alert("That's you!");
    const [a,b]=[profile.full_name, cleanName].sort();
    let {data:existing}=await supabase.from('dm_threads').select('*').eq('user_a',a).eq('user_b',b).single();
    if(!existing){
      const {data:newThread}=await supabase.from('dm_threads').insert({user_a:a, user_b:b, last_message:`Started chat`, last_message_at: new Date().toISOString()}).select().single();
      existing=newThread;
    }
    setActiveThread(existing); setShowDM(true);
    const {data:msgs}=await supabase.from('dm_messages').select('*').eq('thread_id', existing.id).order('created_at',{ascending:true});
    if(msgs) setDmMessages(msgs);
    loadThreads();
    setTimeout(()=>dmInputRef.current?.focus(), 400);
  };
  const openThread = async (thread:any) => {
    setActiveThread(thread);
    const {data:msgs}=await supabase.from('dm_messages').select('*').eq('thread_id', thread.id).order('created_at',{ascending:true});
    if(msgs) setDmMessages(msgs);
    setTimeout(()=>dmInputRef.current?.focus(), 300);
  };
  const sendDM = async () => {
    if(!dmInput.trim() || !activeThread || !profile) return;
    const {data}=await supabase.from('dm_messages').insert({thread_id:activeThread.id, sender_name:profile.full_name, body:dmInput.trim()}).select().single();
    if(data){
      setDmMessages([...dmMessages, data]);
      await supabase.from('dm_threads').update({last_message:dmInput.trim().slice(0,40), last_message_at: new Date().toISOString()}).eq('id', activeThread.id);
      setDmInput('');
      loadThreads();
      setTimeout(()=>dmInputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#1a3a2f] w-full overflow-x-hidden">
      <header className="sticky top-0 bg-white border-b z-40 w-full">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-auto sm:h-14 py-3 sm:py-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 bg-[#1a3a2f] text-white rounded-lg flex items-center justify-center font-black shrink-0">N</div>
            <b className="truncate">Neighborly KC</b>
            <span className="text-[10px] sm:text-xs bg-green-100 border px-2 py-1 rounded-full font-bold whitespace-nowrap">● LIVE {cur?.name} {cur?.zip}</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto items-center flex-wrap">
            {showInstall && <button onClick={handleInstall} className="bg-[#1a3a2f] text-white border-2 border-[#1a3a2f] px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold shrink-0 animate-pulse">⬇️ Install App</button>}
            <select value={hood} onChange={e=>setHood(e.target.value)} className="bg-[#f8f5ee] border rounded-full px-3 py-2 text-xs sm:text-sm font-bold flex-1 sm:flex-none min-w-0">
              {hoods.map((h:any)=><option key={h.slug} value={h.slug}>{h.name} {h.zip}</option>)}
            </select>
            {profile && <button onClick={()=>{setShowDM(true); loadThreads();}} className="bg-white border-2 border-[#1a3a2f] text-[#1a3a2f] px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold shrink-0">💬 DMs {threads.length>0?`(${threads.length})`:''}</button>}
            {profile?<span className="bg-[#1a3a2f] text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm shrink-0">Hi, {profile.full_name.split(' ')[0]} ✓</span>:<button onClick={()=>setShowJoin(true)} className="bg-[#1a3a2f] text-white px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold shrink-0">Join {cur?.name}</button>}
          </div>
        </div>
      </header>

      <div className="w-full flex justify-center">
        <div className="w-full max-w-6xl px-3 sm:px-6 py-6 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-4 sm:gap-6 w-full justify-center">
            <aside className="lg:sticky lg:top-24 h-fit w-full max-w-full overflow-hidden lg:mt-8">
              <div className="lg:hidden mb-3">
                <button onClick={()=>setShowFilters(!showFilters)} className="w-full bg-white border rounded-xl px-4 py-3 text-sm font-bold flex justify-between items-center shadow-sm">Filter: {cat} <span>{showFilters?'▲':'▼'}</span></button>
                {showFilters && <div className="mt-2 bg-white rounded-xl border p-2 grid grid-cols-2 gap-2 shadow-sm">{CATS.map(c=><button key={c} onClick={()=>{setCat(c); setShowFilters(false);}} className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left truncate ${cat===c?'bg-[#1a3a2f] text-white':'bg-[#f8f5ee]'}`}>{c}</button>)}</div>}
              </div>
              <div className="hidden lg:block bg-white rounded-2xl p-3 border w-full shadow-sm"><p className="text-xs font-bold opacity-40 px-3 py-2">FILTER</p>{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm truncate ${cat===c?'bg-[#1a3a2f] text-white':'hover:bg-black/5'}`}>{c}</button>)}</div>
            </aside>

            <main className="w-full max-w-[680px] mx-auto min-w-0 space-y-4 mt-2 sm:mt-8">
              <div className="bg-white rounded-2xl p-3 sm:p-4 border w-full shadow-sm">
                <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur?.name}?`:'Join Parkwood Hills to post...'} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[80px] text-sm outline-none resize-none max-w-full" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3 w-full"><input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs w-full sm:w-auto max-w-full truncate" />{file && <span className="text-[10px] opacity-60 truncate">{(file.size/1024).toFixed(0)}KB → ~400KB</span>}</div>
                <div className="flex justify-end mt-3 w-full"><button disabled={uploading} onClick={handlePost} className="w-full sm:w-auto bg-[#1a3a2f] text-white px-5 py-3 sm:py-2 rounded-full text-sm font-bold disabled:opacity-50">{uploading?'Uploading...':'Post to neighbors'}</button></div>
              </div>
              {filtered.map((p:any)=>{
                const cList=comments[p.id]||[]; const isOpen=openComments[p.id]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_name===profile?.full_name);
                const isOwner = profile && (p.profiles?.full_name===profile.full_name || p.author_name===profile.full_name); 
                const canDelete = isOwner || isAdmin;
                const authorName = p.author_name || p.profiles?.full_name || 'Neighbor';
                return (
                <div key={p.id} className="bg-white rounded-2xl p-3 sm:p-4 border w-full shadow-sm min-w-0 overflow-hidden">
                  <div className="flex justify-between gap-2 min-w-0"><button onClick={()=>startDM(authorName)} className="text-xs font-bold opacity-80 truncate min-w-0 flex-1 text-left hover:underline">👤 {authorName} · {p.category} → Message</button>{canDelete && <button onClick={()=>deletePost(p.id,p.image_url)} className="text-xs opacity-40 hover:text-red-600 shrink-0">🗑️ Delete</button>}</div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm sm:text-[15px] leading-relaxed w-full">{p.body || p.content}</p>
                  {p.image_url && <img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[500px] w-full max-w-full object-cover border" />}
                  <p className="text-[10px] sm:text-xs opacity-40 mt-2 truncate">{new Date(p.created_at).toLocaleString()}</p>
                  <div className="mt-3 pt-3 border-t flex gap-4">
                    <button onClick={()=>togglePostLike(p.id)} className={`text-xs font-bold ${liked?'text-red-600':'opacity-60 hover:opacity-100'}`}>{liked?'❤️':'🤍'} {pLikes.length} {pLikes.length===1?'Like':'Likes'}</button>
                    <button onClick={()=>setOpenComments((prev)=>({...prev,[p.id]:!prev[p.id]}))} className="text-xs font-bold hover:underline opacity-60">💬 {cList.length} {cList.length===1?'Comment':'Comments'} {isOpen?'▲':'▼'}</button>
                    <button onClick={()=>startDM(authorName)} className="text-xs font-bold opacity-60 hover:opacity-100 ml-auto">✉️ DM {authorName.split(' ')[0]}</button>
                  </div>
                  {isOpen && (
                    <div className="mt-3 bg-[#f8f5ee] rounded-xl p-2 sm:p-3 space-y-2 w-full">
                      {cList.map((c:any)=>{
                        const cl=cLikes[c.id]||[]; const cliked=cl.some((l:any)=>l.author_name===profile?.full_name); const canDelC = (profile && c.author_name===profile.full_name) || isAdmin;
                        return (<div key={c.id} className="text-sm bg-white rounded-lg p-2 flex justify-between gap-2 w-full min-w-0"><div className="min-w-0 flex-1 break-words"><b className="text-xs cursor-pointer hover:underline" onClick={()=>startDM(c.author_name)}>{c.author_name}:</b> <span className="break-words">{c.content||c.body}</span> <span className="text-[10px] opacity-40 ml-1 whitespace-nowrap">{new Date(c.created_at).toLocaleTimeString()}</span><button onClick={()=>toggleCommentLike(c.id)} className={`ml-2 text-xs ${cliked?'text-red-600':'opacity-50'}`}>{cliked?'❤️':'🤍'} {cl.length}</button></div>{canDelC && <button onClick={()=>deleteComment(c.id,p.id)} className="text-[10px] opacity-30 hover:text-red-600 shrink-0">🗑️</button>}</div>);
                      })}
                      {cList.length===0 && <p className="text-xs opacity-50">Be first to comment — newest on top</p>}
                      <div className="flex gap-2 pt-2 w-full"><input value={commentText[p.id]||''} onChange={e=>setCommentText((prev)=>({...prev,[p.id]:e.target.value}))} placeholder={profile?'Add a comment...':'Join to comment'} className="flex-1 bg-white border rounded-full px-3 py-2.5 text-sm outline-none min-w-0" /><button onClick={()=>addComment(p.id)} className="bg-[#1a3a2f] text-white px-4 py-2.5 rounded-full text-xs font-bold shrink-0">Reply</button></div>
                    </div>
                  )}
                </div>
              )})}
            </main>

            <aside className="bg-white rounded-2xl p-4 sm:p-5 border h-fit w-full max-w-full lg:sticky lg:top-24 lg:mt-8 order-first lg:order-last shadow-sm">
              <h3 className="font-black truncate">{cur?.name}</h3><p className="text-xs opacity-60 truncate">{cur?.zip} · Kansas City, MO</p>
              <div className="grid grid-cols-2 gap-2 mt-4"><div className="bg-[#f8f5ee] rounded-xl p-3 text-center min-w-0"><b className="text-lg">{cur?.member_count}</b><p className="text-[10px]">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-3 text-center min-w-0"><b className="text-lg">{posts.length}</b><p className="text-[10px]">POSTS</p></div></div>
              {profile && <button onClick={()=>{setShowDM(true); loadThreads();}} className="mt-4 w-full bg-white border-2 border-[#1a3a2f] py-3 rounded-full text-sm font-bold">💬 Open DMs</button>}
            </aside>
          </div>
        </div>
      </div>

      {showJoin && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto"><h2 className="font-black text-xl">Join {cur?.name}</h2><form onSubmit={e=>{e.preventDefault(); const pr={full_name:name,email,street_address:addr,zip:cur?.zip,neighborhood_id:cur?.id}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false);}} className="mt-4 space-y-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><input required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><input required value={addr} onChange={e=>setAddr(e.target.value)} placeholder={`Address in ${cur?.zip}`} className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><div className="flex gap-2 pt-2"><button type="button" onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button><button className="flex-1 bg-[#1a3a2f] text-white py-3 rounded-full font-bold text-sm">Join</button></div></form></div></div>}

      {showDM && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setShowDM(false)}></div>
          <div className="relative w-full sm:w-[400px] bg-white h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-[#1a3a2f] text-white"><b>💬 Messages</b><button onClick={()=>setShowDM(false)} className="opacity-70 hover:opacity-100">✕</button></div>
            {!activeThread ? (
              <div className="flex-1 overflow-y-auto"><p className="p-4 text-xs font-bold opacity-40">YOUR CONVERSATIONS</p>{threads.length===0 && <p className="p-4 text-sm opacity-60">No DMs yet. Click "DM" on any post to start!</p>}{threads.map((t:any)=>(<button key={t.id} onClick={()=>openThread(t)} className="w-full text-left p-4 border-b hover:bg-[#f8f5ee] flex justify-between items-center"><div className="min-w-0 flex-1"><p className="font-bold text-sm truncate">{t.user_a===profile?.full_name ? t.user_b : t.user_a}</p><p className="text-xs opacity-60 truncate">{t.last_message}</p></div><span className="text-[10px] opacity-40 shrink-0 ml-2">{new Date(t.last_message_at).toLocaleDateString()}</span></button>))}</div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b flex items-center gap-2"><button onClick={()=>setActiveThread(null)} className="text-sm font-bold">← Back</button><b className="text-sm truncate">{activeThread.user_a===profile?.full_name ? activeThread.user_b : activeThread.user_a}</b></div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#f8f5ee]">
                  {dmMessages.map((m:any)=>{ const isMe = m.sender_name===profile?.full_name; return (<div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm break-words ${isMe?'bg-[#1a3a2f] text-white ml-auto rounded-br-sm':'bg-white border mr-auto rounded-bl-sm'}`}><p>{m.body}</p><p className={`text-[9px] mt-1 ${isMe?'opacity-60':'opacity-40'}`}>{new Date(m.created_at).toLocaleTimeString()}</p></div>); })}
                  <div ref={dmBottomRef}></div>
                </div>
                <div className="p-3 border-t flex gap-2">
                  <input ref={dmInputRef} value={dmInput} onChange={e=>setDmInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') sendDM();}} placeholder={`Message...`} className="flex-1 bg-[#f8f5ee] rounded-full px-4 py-3 text-sm outline-none min-w-0" autoFocus inputMode="text" />
                  <button onClick={sendDM} className="bg-[#1a3a2f] text-white px-5 py-3 rounded-full text-sm font-bold shrink-0">Send</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
