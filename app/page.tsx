'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];
const MAX_SIZE = 3 * 1024 * 1024;
const ALLOWED = ['image/jpeg','image/jpg','image/png'];

async function compress(file: File){
  const img=document.createElement('img'); const canvas=document.createElement('canvas');
  const url=await new Promise<string>(r=>{ const rd=new FileReader(); rd.onload=()=>r(rd.result as string); rd.readAsDataURL(file); });
  await new Promise<void>(res=>{ img.onload=()=>res(); img.src=url; });
  const max=1200; let {width,height}=img; if(width>max||height>max){ if(width>height){height=height*max/width;width=max;} else {width=width*max/height;height=max;}}
  canvas.width=width; canvas.height=height; canvas.getContext('2d')!.drawImage(img,0,0,width,height);
  const blob=await new Promise<Blob>(res=>canvas.toBlob(b=>res(b!), 'image/jpeg',0.7));
  return new File([blob], file.name.replace(/\.\w+$/,'.jpg'), {type:'image/jpeg'});
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
  const [deferredPrompt,setDeferredPrompt]=useState<any>(null); const [showInstall,setShowInstall]=useState(false);
  const [verifyFile,setVerifyFile]=useState<File|null>(null); const [verifying,setVerifying]=useState(false); const [verifyStatus,setVerifyStatus]=useState('');

  useEffect(()=>{
    const isStandalone=window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if(isStandalone) return; const h=(e:any)=>{ e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt',h); if(/iPad|iPhone|iPod/.test(navigator.userAgent)) setShowInstall(true);
    return()=>window.removeEventListener('beforeinstallprompt',h);
  },[]);
  const handleInstall=async()=>{ if(deferredPrompt){ deferredPrompt.prompt(); const {outcome}=await deferredPrompt.userChoice; if(outcome==='accepted') setShowInstall(false); setDeferredPrompt(null);} else alert('iPhone: Share → Add to Home Screen'); };

  const loadAll=async(ids:string[])=>{
    if(!ids.length) return;
    const {data:com}=await supabase.from('comments').select('*').in('post_id',ids).order('created_at',{ascending:false});
    if(com){ const g:Record<string,any[]>={}; com.forEach((c:any)=>{ if(!g[c.post_id]) g[c.post_id]=[]; g[c.post_id].push(c); }); setComments(g);
      const cIds=com.map((c:any)=>c.id); if(cIds.length){ const {data:cl}=await supabase.from('likes').select('*').in('comment_id',cIds); if(cl){ const cg:Record<string,any[]>={}; cl.forEach((l:any)=>{ if(!cg[l.comment_id]) cg[l.comment_id]=[]; cg[l.comment_id].push(l); }); setCLikes(cg);} }
    }
    const {data:lk}=await supabase.from('likes').select('*').in('post_id',ids).is('comment_id',null);
    if(lk){ const lg:Record<string,any[]>={}; lk.forEach((l:any)=>{ if(!lg[l.post_id]) lg[l.post_id]=[]; lg[l.post_id].push(l); }); setLikes(lg); }
  };
  useEffect(()=>{ (async()=>{
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false}); if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(50);
    if(p){ setPosts(p); loadAll(p.map((x:any)=>x.id)); }
    const s=localStorage.getItem('nkc_profile'); if(s) setProfile(JSON.parse(s));
  })() },[]);
  const loadThreads=async()=>{ if(!profile) return; const {data}=await supabase.from('dm_threads').select('*').or(`user_a.eq.${profile.full_name},user_b.eq.${profile.full_name}`).order('last_message_at',{ascending:false}); if(data) setThreads(data); };
  useEffect(()=>{ if(profile) loadThreads(); },[profile,showDM]);
  useEffect(()=>{ if(!activeThread) return; const id=setInterval(async()=>{ const {data}=await supabase.from('dm_messages').select('*').eq('thread_id',activeThread.id).order('created_at',{ascending:true}); if(data) setDmMessages(data); },2500); return()=>clearInterval(id); },[activeThread]);
  useEffect(()=>{ dmBottomRef.current?.scrollIntoView({behavior:'smooth'}); },[dmMessages]);

  const cur=hoods.find((x:any)=>x.slug===hood) || hoods[0] || {name:'Parkwood Hills', zip:'64155', id:null, slug:'parkwood-hills', member_count:247};
  const filtered=cat==='All'? posts : posts.filter((p:any)=>p.category===cat);
  const isAdmin=profile?.full_name?.toLowerCase().includes('jason');

  const validateFile=async(f:File)=>{ if(!ALLOWED.includes(f.type)) return 'Only JPG/PNG. No GIFs/memes.'; if(f.size>MAX_SIZE) return `Too big: ${(f.size/1024/1024).toFixed(1)}MB. Max 3MB.`; return null; };

  const handlePost=async()=>{
    if(!profile) return setShowJoin(true); if(!body.trim() && !file) return;
    if(file){ const e=await validateFile(file); if(e){ alert(e); return; } }
    setUploading(true);
    try{
      let image_url:string|null=null;
      if(file){ const comp=await compress(file); const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`; const {error}=await supabase.storage.from('post-images').upload(path, comp); if(error) throw error; const {data}=supabase.storage.from('post-images').getPublicUrl(path); image_url=data.publicUrl; }
      const realId=hoods.find((x:any)=>x.slug===hood)?.id || cur?.id;
      const {data,error}=await supabase.from('posts').insert({body, category:cat==='All'?'General':cat, neighborhood_id:realId, image_url, author_name:profile.full_name}).select().single();
      if(error) throw error; setPosts([{...data, profiles:{full_name:profile.full_name}},...posts]); setBody(''); setFile(null); (document.getElementById('file-input') as HTMLInputElement).value='';
    }catch(e:any){ alert('Save failed: '+e.message); } finally{ setUploading(false); }
  };

  const toggleLike=async(postId:string)=>{
    if(!profile) return setShowJoin(true); const list=likes[postId]||[]; const mine=list.find((l:any)=>l.author_name===profile.full_name);
    if(mine){ await supabase.from('likes').delete().eq('id',mine.id); setLikes(p=>({...p, [postId]:p[postId].filter((x:any)=>x.id!==mine.id)})); }
    else{ const {data}=await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name}).select().single(); if(data) setLikes(p=>({...p, [postId]:[...(p[postId]||[]), data]})); }
  };

  const startDM=async(otherName:string)=>{
    if(!profile) return setShowJoin(true); const clean=otherName.trim(); if(!clean || clean==='Neighbor') return alert('No name'); if(clean===profile.full_name) return alert("That's you!");
    const [a,b]=[profile.full_name, clean].sort();
    let {data:found}=await supabase.from('dm_threads').select('*').eq('user_a',a).eq('user_b',b).maybeSingle();
    if(!found){ const {data:newT, error}=await supabase.from('dm_threads').insert({user_a:a, user_b:b, last_message:'Chat started', last_message_at:new Date().toISOString()}).select().single(); if(error){ alert('DM thread error: '+error.message); return; } found=newT; }
    setActiveThread(found); setShowDM(true);
    // Try to mark delivered but ignore if status column missing
    try{ await supabase.from('dm_messages').update({status:'delivered'}).eq('thread_id',found.id).neq('sender_name',profile.full_name); }catch{}
    const {data:msgs}=await supabase.from('dm_messages').select('*').eq('thread_id',found.id).order('created_at',{ascending:true}); setDmMessages(msgs||[]); loadThreads();
    setTimeout(()=>dmInputRef.current?.focus(),300);
  };
  const openThread=async(thread:any)=>{
    setActiveThread(thread); try{ await supabase.from('dm_messages').update({status:'read'} as any).eq('thread_id',thread.id).neq('sender_name',profile.full_name); }catch{}
    const {data}=await supabase.from('dm_messages').select('*').eq('thread_id',thread.id).order('created_at',{ascending:true}); setDmMessages(data||[]);
  };
  const sendDM=async()=>{
    if(!dmInput.trim() || !activeThread || !profile) return;
    const text=dmInput.trim(); setDmInput('');
    // Try with status, fallback without status if column missing
    let {data, error}=await supabase.from('dm_messages').insert({thread_id:activeThread.id, sender_name:profile.full_name, body:text, status:'sent'}).select().single();
    if(error && error.message.includes('status')){
      const retry=await supabase.from('dm_messages').insert({thread_id:activeThread.id, sender_name:profile.full_name, body:text}).select().single();
      data=retry.data; error=retry.error as any;
    }
    if(error){ alert('DM failed: '+error.message+'\n\nFix: Run double-ticks.sql in Supabase SQL Editor'); setDmInput(text); return; }
    if(data) setDmMessages([...dmMessages, data]);
    await supabase.from('dm_threads').update({last_message:text.slice(0,40), last_message_at:new Date().toISOString()}).eq('id',activeThread.id);
    loadThreads(); setTimeout(()=>dmInputRef.current?.focus(),100);
  };

  const handleJoin=async(e:any)=>{
    e.preventDefault(); if(!name.trim()) return alert('Name required'); setVerifying(true); setVerifyStatus(verifyFile?'Uploading...':'Joining...');
    try{
      let verified=false; let imgPath=null;
      if(verifyFile){
        if(verifyFile.size>MAX_SIZE) throw new Error('Mail max 3MB'); if(!ALLOWED.includes(verifyFile.type)) throw new Error('Mail must be JPG/PNG');
        const comp=await compress(verifyFile); const path=`${name.replace(/\s+/g,'_')}-${Date.now()}.jpg`;
        const {error}=await supabase.storage.from('verification-docs').upload(path, comp); if(error) throw error; imgPath=path;
        setVerifyStatus('Checking address...');
        try{
          const {data:signed}=await supabase.storage.from('verification-docs').createSignedUrl(path,60);
          if(signed?.signedUrl){
            const r=await fetch('/api/verify-address',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({imageUrl:signed.signedUrl, claimedAddress:addr, claimedZip:cur?.zip})});
            const res=await r.json(); verified=res.approved; setVerifyStatus(res.approved?'✓ Verified!':'AI: '+res.reason);
            await supabase.from('verification_requests').insert({full_name:name, claimed_address:addr, claimed_zip:cur?.zip, email, image_path:path, status:res.approved?'approved':'pending', ai_reason:res.reason});
          }
        }catch{ await supabase.from('verification_requests').insert({full_name:name, claimed_address:addr, claimed_zip:cur?.zip, email, image_path:path, status:'pending', ai_reason:'AI not configured'}); }
      }
      const pr={full_name:name,email,street_address:addr,zip:cur?.zip,neighborhood_id:cur?.id, verified, verification_path:imgPath};
      localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false); setVerifyFile(null); setVerifyStatus('');
    }catch(err:any){ alert(err.message); } finally{ setVerifying(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#1a3a2f] w-screen overflow-x-hidden">
      <style>{`
        *{ max-width:100%; box-sizing:border-box; }
        input, textarea { font-size:16px !important; } /* prevents iPhone zoom */
        img{ max-width:100%; height:auto; }
      `}</style>
      <header className="sticky top-0 bg-white border-b z-40 w-full overflow-hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-auto min-h-[56px] py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 bg-[#1a3a2f] text-white rounded-lg flex items-center justify-center font-black shrink-0">N</div>
            <b className="truncate text-sm sm:text-base">Neighborly KC</b>
            <span className="hidden xs:inline text-[10px] bg-green-100 border px-2 py-0.5 rounded-full font-bold whitespace-nowrap">● {cur?.zip}</span>
          </div>
          <div className="flex gap-2 items-center shrink-0 w-full sm:w-auto">
            {showInstall && <button onClick={handleInstall} className="flex-1 sm:flex-none bg-[#1a3a2f] text-white px-3 py-2.5 rounded-full text-xs font-bold animate-pulse">⬇️ Install</button>}
            <select value={hood} onChange={e=>setHood(e.target.value)} className="bg-[#f8f5ee] border rounded-full px-2 py-2 text-xs font-bold flex-1 sm:flex-none min-w-0 truncate"><option>{cur?.name} {cur?.zip}</option>{hoods.map((h:any)=><option key={h.slug} value={h.slug}>{h.name}</option>)}</select>
            {profile && <button onClick={()=>{setShowDM(true); loadThreads();}} className="bg-white border-2 border-[#1a3a2f] px-3 py-2 rounded-full text-xs font-bold shrink-0">💬</button>}
            {profile ? <span className="bg-[#1a3a2f] text-white px-3 py-2 rounded-full text-xs truncate max-w-[90px]">{profile.verified?'✓ ':''}{profile.full_name.split(' ')[0]}</span> : <button onClick={()=>setShowJoin(true)} className="bg-[#1a3a2f] text-white px-4 py-2.5 rounded-full text-xs font-bold shrink-0">Join</button>}
          </div>
        </div>
      </header>

      <div className="w-full flex justify-center overflow-x-hidden"><div className="w-full max-w-6xl px-3 py-4 sm:py-6 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_280px] gap-3 sm:gap-6 w-full">
          <aside className="lg:sticky lg:top-20 h-fit w-full order-2 lg:order-1">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
              {CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`whitespace-nowrap shrink-0 px-4 py-2.5 rounded-full text-xs font-bold border ${cat===c?'bg-[#1a3a2f] text-white':'bg-white'}`}>{c}</button>)}
            </div>
          </aside>

          <main className="w-full max-w-full min-w-0 space-y-3 order-1 lg:order-2">
            <div className="bg-white rounded-2xl p-3 border shadow-sm w-full max-w-full overflow-hidden">
              <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur?.name}?`:'Join to post...'} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[70px] text-[16px] outline-none resize-none" rows={2}/>
              <div className="flex items-center gap-2 mt-2 w-full min-w-0"><input id="file-input" type="file" accept="image/jpeg,image/png,image/jpg" onChange={async e=>{ const f=e.target.files?.[0]; if(!f) return; const err=await validateFile(f); if(err){ alert(err); e.target.value=''; return; } setFile(f); }} className="text-[11px] w-full min-w-0 truncate" /><button disabled={uploading} onClick={handlePost} className="shrink-0 bg-[#1a3a2f] text-white px-5 py-2.5 rounded-full text-xs font-bold disabled:opacity-50">{uploading?'...':'Post'}</button></div>
              {file && <p className="text-[10px] mt-1 text-green-600 truncate">✓ {(file.size/1024).toFixed(0)}KB → ~300KB ready</p>}
            </div>
            {filtered.map((p:any)=>{
              const cList=comments[p.id]||[]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_name===profile?.full_name);
              return (
              <div key={p.id} className="bg-white rounded-2xl p-3 border shadow-sm w-full max-w-full overflow-hidden">
                <div className="flex justify-between gap-2 w-full min-w-0"><span className="text-[11px] font-bold opacity-70 truncate flex-1 min-w-0">👤 {p.author_name || 'Neighbor'} · {p.category}</span><button onClick={()=>{ if(confirm('Delete?')) { supabase.from('posts').delete().eq('id',p.id).then(()=>setPosts(posts.filter((x:any)=>x.id!==p.id))); }}} className="text-[10px] opacity-30 shrink-0">{profile?.full_name===p.author_name || isAdmin ? '🗑️':''}</button></div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-[1.4] w-full max-w-full overflow-hidden" style={{wordBreak:'break-word', overflowWrap:'anywhere'}}>{p.body}</p>
                {p.image_url && <img src={p.image_url} alt="" className="mt-2 rounded-xl w-full max-w-full object-cover border max-h-[380px]" loading="lazy" />}
                <p className="text-[10px] opacity-40 mt-1">{new Date(p.created_at).toLocaleString()}</p>
                <div className="mt-2 pt-2 border-t flex gap-3 w-full"><button onClick={()=>toggleLike(p.id)} className={`text-xs font-bold ${liked?'text-red-600':'opacity-60'}`}>{liked?'❤️':'🤍'} {pLikes.length}</button><button onClick={()=>setOpenComments(s=>({...s,[p.id]:!s[p.id]}))} className="text-xs font-bold opacity-60">💬 {cList.length}</button><button onClick={()=>startDM(p.author_name)} className="text-xs font-bold opacity-60 ml-auto shrink-0">✉️ DM</button></div>
              </div>
            )})}
          </main>

          <aside className="bg-white rounded-2xl p-4 border h-fit w-full order-3 hidden lg:block sticky top-20"><h3 className="font-black truncate text-sm">{cur?.name}</h3><p className="text-xs opacity-60">{cur?.zip}</p><div className="grid grid-cols-2 gap-2 mt-3"><div className="bg-[#f8f5ee] rounded-xl p-2 text-center"><b>{cur?.member_count}</b><p className="text-[9px]">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-2 text-center"><b>{posts.length}</b><p className="text-[9px]">POSTS</p></div></div>{profile && <button onClick={()=>{setShowDM(true); loadThreads();}} className="mt-3 w-full border-2 border-[#1a3a2f] py-2.5 rounded-full text-xs font-bold">💬 Open DMs</button>}</aside>
        </div>
      </div></div>

      {showJoin && <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"><div className="bg-white rounded-t-[20px] sm:rounded-2xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto"><h2 className="font-black">Join {cur?.name}</h2><form onSubmit={handleJoin} className="mt-3 space-y-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-[16px]"/><input required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-[16px]"/><input required value={addr} onChange={e=>setAddr(e.target.value)} placeholder={`Address in ${cur?.zip}`} className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-[16px]"/><div className="bg-[#f8f5ee] rounded-xl p-3 border-2 border-dashed"><p className="text-xs font-bold">📬 Verify (optional - gets ✓)</p><p className="text-[10px] opacity-60">Mail with your address. Private, deletes in 24h.</p><input type="file" accept="image/jpeg,image/png,image/jpg" onChange={e=>{ const f=e.target.files?.[0]; if(f){ if(f.size>MAX_SIZE){ alert('Max 3MB'); e.target.value=''; return; } setVerifyFile(f);} }} className="w-full text-[11px] mt-2" />{verifyFile && <p className="text-[10px] text-green-600 mt-1 truncate">✓ {verifyFile.name}</p>}{verifyStatus && <p className="text-xs font-bold mt-1">{verifyStatus}</p>}</div><div className="flex gap-2 pt-2"><button type="button" onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button><button disabled={verifying} className="flex-1 bg-[#1a3a2f] text-white py-3 rounded-full font-bold text-sm disabled:opacity-50">{verifying?'Verifying...':'Join'}</button></div></form></div></div>}

      {showDM && (
        <div className="fixed inset-0 z-[60] flex justify-end"><div className="absolute inset-0 bg-black/40" onClick={()=>setShowDM(false)}></div>
          <div className="relative w-full sm:w-[380px] bg-white h-[100dvh] flex flex-col shadow-2xl max-w-full">
            <div className="h-[56px] px-4 border-b flex justify-between items-center bg-[#1a3a2f] text-white shrink-0"><b className="text-sm truncate">{activeThread ? (activeThread.user_a===profile?.full_name ? activeThread.user_b : activeThread.user_a) : 'Messages'}</b><button onClick={()=> activeThread ? setActiveThread(null) : setShowDM(false)} className="px-2 py-1 text-sm shrink-0">{activeThread?'← Back':'✕'}</button></div>
            {!activeThread ? (
              <div className="flex-1 overflow-y-auto overscroll-contain"><div className="p-3 text-[10px] font-bold opacity-40">CONVERSATIONS</div>{threads.length===0 && <p className="p-4 text-sm opacity-60">No DMs yet. Tap DM on a post.</p>}{threads.map((t:any)=><button key={t.id} onClick={()=>openThread(t)} className="w-full text-left p-3 border-b flex justify-between gap-2 hover:bg-[#f8f5ee]"><div className="min-w-0 flex-1"><p className="font-bold text-[13px] truncate">{t.user_a===profile?.full_name ? t.user_b : t.user_a}</p><p className="text-xs opacity-60 truncate max-w-[200px]">{t.last_message}</p></div><span className="text-[10px] opacity-40 shrink-0">{new Date(t.last_message_at).toLocaleDateString()}</span></button>)}</div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2 bg-[#f8f5ee] w-full max-w-full">
                  {dmMessages.map((m:any)=>{ const isMe=m.sender_name===profile?.full_name; return (<div key={m.id} className={`max-w-[75%] rounded-2xl px-3 py-2 text-[14px] break-words overflow-hidden ${isMe?'bg-[#1a3a2f] text-white ml-auto rounded-br-sm':'bg-white border mr-auto rounded-bl-sm'}`} style={{wordBreak:'break-word', overflowWrap:'anywhere'}}><p>{m.body}</p><p className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${isMe?'opacity-70':'opacity-40'}`}>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} {isMe && <span className={`font-bold ${m.status==='read'?'text-[#53bdeb]':''}`}>{m.status==='read'?'✓✓': m.status==='delivered'?'✓✓':'✓'}</span>}</p></div>); })}
                  <div ref={dmBottomRef}></div>
                </div>
                <div className="p-2 border-t flex gap-2 bg-white shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                  <input ref={dmInputRef} value={dmInput} onChange={e=>setDmInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendDM(); }}} placeholder="Message..." className="flex-1 bg-[#f8f5ee] rounded-full px-4 py-3 text-[16px] outline-none min-w-0" enterKeyHint="send" />
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
