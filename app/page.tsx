'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];
const MAX_SIZE = 3 * 1024 * 1024;
const ALLOWED = ['image/jpeg','image/jpg','image/png'];
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BNgdNknrf04cpMRMt4sfbcfvVuSU97ATzw5xfeJZe5R-EPo7GQwcHfTy5c1eP7yQhJQrVGq4Cjr4wE9FxNvIOls';

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
  const [file,setFile]=useState<File|null>(null); const [uploading,setUploading]=useState(false);
  const [showDM,setShowDM]=useState(false); const [threads,setThreads]=useState<any[]>([]); const [activeThread,setActiveThread]=useState<any>(null);
  const [dmMessages,setDmMessages]=useState<any[]>([]); const [dmInput,setDmInput]=useState(''); const [pushOn,setPushOn]=useState(false);
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

  const enablePush = async () => {
    if(!profile){ alert('Join first'); return; }
    if(!('serviceWorker' in navigator) || !('PushManager' in window)){ alert('Push not supported on this browser'); return; }
    try{
      const perm = await Notification.requestPermission();
      if(perm!=='granted'){ alert('Please allow notifications'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      let sub = existing;
      if(!existing){
        // convert VAPID key
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = atob(base64);
          return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
        };
        sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as any});
      }
      const res = await fetch('/api/push/subscribe', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({user_name: profile.full_name, subscription: sub})});
      if(res.ok){ setPushOn(true); alert('✅ DM buzz ON! You will get notified even when app is closed.'); localStorage.setItem('nkc_push','1'); }
      else { const t=await res.text(); alert('Push save failed: '+t); }
    }catch(e:any){ alert('Push error: '+e.message); }
  };
  useEffect(()=>{ if(localStorage.getItem('nkc_push')) setPushOn(true); },[]);

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

  const validateFile=async(f:File)=>{ if(!ALLOWED.includes(f.type)) return 'Only JPG/PNG'; if(f.size>MAX_SIZE) return `Too big ${(f.size/1024/1024).toFixed(1)}MB max 3MB`; return null; };

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
    }catch(e:any){ alert(e.message); } finally{ setUploading(false); }
  };

  const toggleLike=async(postId:string)=>{
    if(!profile) return setShowJoin(true); const list=likes[postId]||[]; const mine=list.find((l:any)=>l.author_name===profile.full_name);
    if(mine){ await supabase.from('likes').delete().eq('id',mine.id); setLikes(p=>({...p, [postId]:p[postId].filter((x:any)=>x.id!==mine.id)})); }
    else{ const {data}=await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name}).select().single(); if(data) setLikes(p=>({...p, [postId]:[...(p[postId]||[]), data]})); }
  };

  const startDM=async(otherName:string)=>{
    if(!profile) return setShowJoin(true); const clean=otherName.trim(); if(!clean || clean==='Neighbor') return; if(clean===profile.full_name) return alert("That's you!");
    const [a,b]=[profile.full_name, clean].sort();
    let {data:found}=await supabase.from('dm_threads').select('*').eq('user_a',a).eq('user_b',b).maybeSingle();
    if(!found){ const {data:newT, error}=await supabase.from('dm_threads').insert({user_a:a, user_b:b, last_message:'Chat started', last_message_at:new Date().toISOString()}).select().single(); if(error){ alert(error.message); return; } found=newT; }
    setActiveThread(found); setShowDM(true);
    try{ await supabase.from('dm_messages').update({status:'delivered'} as any).eq('thread_id',found.id).neq('sender_name',profile.full_name); }catch{}
    const {data:msgs}=await supabase.from('dm_messages').select('*').eq('thread_id',found.id).order('created_at',{ascending:true}); setDmMessages(msgs||[]); loadThreads();
  };
  const openThread=async(thread:any)=>{
    setActiveThread(thread); try{ await supabase.from('dm_messages').update({status:'read'} as any).eq('thread_id',thread.id).neq('sender_name',profile.full_name); }catch{}
    const {data}=await supabase.from('dm_messages').select('*').eq('thread_id',thread.id).order('created_at',{ascending:true}); setDmMessages(data||[]);
  };
  const sendDM=async()=>{
    if(!dmInput.trim() || !activeThread || !profile) return;
    const text=dmInput.trim(); const other = activeThread.user_a===profile.full_name ? activeThread.user_b : activeThread.user_a;
    setDmInput('');
    let {data, error}=await supabase.from('dm_messages').insert({thread_id:activeThread.id, sender_name:profile.full_name, body:text, status:'sent'}).select().single();
    if(error && error.message.includes('status')){
      const retry=await supabase.from('dm_messages').insert({thread_id:activeThread.id, sender_name:profile.full_name, body:text}).select().single();
      data=retry.data; error=retry.error as any;
    }
    if(error){ alert('DM failed: '+error.message); setDmInput(text); return; }
    if(data) setDmMessages(prev=>[...prev, data]);
    await supabase.from('dm_threads').update({last_message:text.slice(0,40), last_message_at:new Date().toISOString()}).eq('id',activeThread.id);
    loadThreads();
    // Fire push notification to other user
    fetch('/api/push/send', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({to: other, from: profile.full_name, message: text})}).catch(()=>{});
  };

  const handleJoin=async(e:any)=>{
    e.preventDefault(); if(!name.trim()) return alert('Name'); setVerifying(true); setVerifyStatus(verifyFile?'Uploading...':'Joining...');
    try{
      let verified=false; let imgPath=null;
      if(verifyFile){
        if(verifyFile.size>MAX_SIZE) throw new Error('Mail max 3MB'); if(!ALLOWED.includes(verifyFile.type)) throw new Error('Mail JPG/PNG only');
        const comp=await compress(verifyFile); const path=`${name.replace(/\s+/g,'_')}-${Date.now()}.jpg`;
        const {error}=await supabase.storage.from('verification-docs').upload(path, comp); if(error) throw error; imgPath=path;
        setVerifyStatus('Checking...'); try{
          const {data:signed}=await supabase.storage.from('verification-docs').createSignedUrl(path,60);
          if(signed?.signedUrl){ const r=await fetch('/api/verify-address',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({imageUrl:signed.signedUrl, claimedAddress:addr, claimedZip:cur?.zip})}); const res=await r.json(); verified=res.approved; setVerifyStatus(res.approved?'✓ Verified!':'AI: '+res.reason); await supabase.from('verification_requests').insert({full_name:name, claimed_address:addr, claimed_zip:cur?.zip, email, image_path:path, status:res.approved?'approved':'pending', ai_reason:res.reason}); }
        }catch{ await supabase.from('verification_requests').insert({full_name:name, claimed_address:addr, claimed_zip:cur?.zip, email, image_path:path, status:'pending'}); }
      }
      const pr={full_name:name,email,street_address:addr,zip:cur?.zip,neighborhood_id:cur?.id, verified, verification_path:imgPath};
      localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false); setVerifyFile(null); setVerifyStatus('');
    }catch(err:any){ alert(err.message); } finally{ setVerifying(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#1a3a2f] w-screen overflow-x-hidden">
      <style>{`* {box-sizing:border-box; max-width:100%;} input,textarea{font-size:16px !important;} img{max-width:100%; height:auto;}`}</style>
      <header className="sticky top-0 bg-white border-b z-40 w-full">
        <div className="max-w-6xl mx-auto px-3 h-[56px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0"><div className="w-8 h-8 bg-[#1a3a2f] text-white rounded-lg flex items-center justify-center font-black shrink-0">N</div><b className="truncate text-sm">Neighborly KC</b></div>
          <div className="flex gap-1.5 items-center shrink-0">
            {showInstall && <button onClick={handleInstall} className="bg-[#1a3a2f] text-white px-3 py-2 rounded-full text-[11px] font-bold animate-pulse">⬇️ Install</button>}
            {profile && <button onClick={enablePush} className={`px-3 py-2 rounded-full text-[11px] font-bold border-2 shrink-0 ${pushOn?'bg-green-100 border-green-600':'bg-white border-[#1a3a2f] animate-pulse'}`}>{pushOn?'🔔 ON':'🔔 Buzz'}</button>}
            <select value={hood} onChange={e=>setHood(e.target.value)} className="bg-[#f8f5ee] border rounded-full px-2 py-2 text-[11px] font-bold truncate max-w-[90px]"><option>{cur?.name}</option>{hoods.map((h:any)=><option key={h.slug} value={h.slug}>{h.name}</option>)}</select>
            {profile ? <button onClick={()=>{setShowDM(true); loadThreads();}} className="bg-white border-2 border-[#1a3a2f] w-9 h-9 rounded-full text-sm font-bold shrink-0">💬</button> : <button onClick={()=>setShowJoin(true)} className="bg-[#1a3a2f] text-white px-4 py-2 rounded-full text-xs font-bold shrink-0">Join</button>}
          </div>
        </div>
      </header>

      <div className="w-full flex justify-center"><div className="w-full max-w-6xl px-3 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_280px] gap-3">
          <aside className="lg:sticky lg:top-20 h-fit order-2 lg:order-1"><div className="flex lg:flex-col gap-2 overflow-x-auto pb-2">{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`whitespace-nowrap shrink-0 px-4 py-2.5 rounded-full text-xs font-bold border ${cat===c?'bg-[#1a3a2f] text-white':'bg-white'}`}>{c}</button>)}</div></aside>
          <main className="w-full min-w-0 space-y-3 order-1 lg:order-2">
            <div className="bg-white rounded-2xl p-3 border shadow-sm"><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur?.name}?`:'Join to post...'} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[70px] text-[16px] outline-none resize-none" rows={2}/><div className="flex items-center gap-2 mt-2"><input id="file-input" type="file" accept="image/jpeg,image/png,image/jpg" onChange={async e=>{ const f=e.target.files?.[0]; if(!f) return; const err=await validateFile(f); if(err){ alert(err); e.target.value=''; return; } setFile(f); }} className="text-[11px] flex-1 min-w-0 truncate" /><button disabled={uploading} onClick={handlePost} className="shrink-0 bg-[#1a3a2f] text-white px-5 py-2.5 rounded-full text-xs font-bold">{uploading?'...':'Post'}</button></div></div>
            {filtered.map((p:any)=><div key={p.id} className="bg-white rounded-2xl p-3 border shadow-sm overflow-hidden"><div className="text-[11px] font-bold opacity-70 truncate">👤 {p.author_name||'Neighbor'} · {p.category}</div><p className="mt-1 whitespace-pre-wrap break-words text-[14px]" style={{overflowWrap:'anywhere'}}>{p.body}</p>{p.image_url && <img src={p.image_url} alt="" className="mt-2 rounded-xl w-full max-h-[380px] object-cover border" />}<div className="mt-2 pt-2 border-t flex gap-3"><button onClick={()=>{ if(!profile) setShowJoin(true); else { const list=likes[p.id]||[]; const mine=list.find((l:any)=>l.author_name===profile.full_name); if(mine){ supabase.from('likes').delete().eq('id',mine.id).then(()=>setLikes(s=>({...s,[p.id]:s[p.id].filter((x:any)=>x.id!==mine.id)}))); } else { supabase.from('likes').insert({post_id:p.id, author_name:profile.full_name}).select().single().then(({data})=>{ if(data) setLikes(s=>({...s,[p.id]:[...(s[p.id]||[]), data]})); }); } } }} className="text-xs font-bold opacity-60">❤️ {likes[p.id]?.length||0}</button><button onClick={()=>setOpenComments(s=>({...s,[p.id]:!s[p.id]}))} className="text-xs font-bold opacity-60">💬 {comments[p.id]?.length||0}</button><button onClick={()=>{ const a=p.author_name; if(!profile) setShowJoin(true); else if(a!==profile.full_name) startDM(a); }} className="text-xs font-bold opacity-60 ml-auto">✉️ DM</button></div></div>)}
          </main>
          <aside className="bg-white rounded-2xl p-4 border h-fit hidden lg:block sticky top-20 order-3"><h3 className="font-black text-sm truncate">{cur?.name}</h3><p className="text-xs opacity-60">{cur?.zip}</p><div className="grid grid-cols-2 gap-2 mt-3"><div className="bg-[#f8f5ee] rounded-xl p-2 text-center"><b>{cur?.member_count}</b><p className="text-[9px]">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-2 text-center"><b>{posts.length}</b><p className="text-[9px]">POSTS</p></div></div>{profile && <><button onClick={()=>{setShowDM(true); loadThreads();}} className="mt-3 w-full border-2 border-[#1a3a2f] py-2.5 rounded-full text-xs font-bold">💬 Open DMs</button><button onClick={enablePush} className={`mt-2 w-full py-2.5 rounded-full text-xs font-bold ${pushOn?'bg-green-100 border':'bg-[#1a3a2f] text-white'}`}>{pushOn?'🔔 Buzz ON':'🔔 Enable DM Buzz'}</button></>}</aside>
        </div>
      </div></div>

      {showJoin && <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"><div className="bg-white rounded-t-[20px] sm:rounded-2xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto"><h2 className="font-black">Join {cur?.name}</h2><form onSubmit={handleJoin} className="mt-3 space-y-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-[16px]"/><input required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-[16px]"/><input required value={addr} onChange={e=>setAddr(e.target.value)} placeholder={`Address in ${cur?.zip}`} className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-[16px]"/><div className="bg-[#f8f5ee] rounded-xl p-3 border-2 border-dashed"><p className="text-xs font-bold">📬 Verify (optional)</p><input type="file" accept="image/jpeg,image/png,image/jpg" onChange={e=>{ const f=e.target.files?.[0]; if(f) setVerifyFile(f); }} className="w-full text-[11px] mt-2" />{verifyFile && <p className="text-[10px] text-green-600 mt-1">✓ {verifyFile.name}</p>}{verifyStatus && <p className="text-xs font-bold mt-1">{verifyStatus}</p>}</div><div className="flex gap-2 pt-2"><button type="button" onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button><button disabled={verifying} className="flex-1 bg-[#1a3a2f] text-white py-3 rounded-full font-bold text-sm">{verifying?'Verifying...':'Join'}</button></div></form></div></div>}

      {showDM && (
        <div className="fixed inset-0 z-[60] flex justify-end"><div className="absolute inset-0 bg-black/40" onClick={()=>setShowDM(false)}></div>
          <div className="relative w-full sm:w-[380px] bg-white h-[100dvh] flex flex-col shadow-2xl">
            <div className="h-[56px] px-4 border-b flex justify-between items-center bg-[#1a3a2f] text-white shrink-0"><b className="text-sm truncate">{activeThread ? (activeThread.user_a===profile?.full_name ? activeThread.user_b : activeThread.user_a) : 'Messages'}</b><button onClick={()=> activeThread ? setActiveThread(null) : setShowDM(false)} className="px-2 py-1 text-sm">{activeThread?'← Back':'✕'}</button></div>
            {!activeThread ? (
              <div className="flex-1 overflow-y-auto"><div className="p-3 text-[10px] font-bold opacity-40">CONVERSATIONS</div>{threads.map((t:any)=><button key={t.id} onClick={()=>openThread(t)} className="w-full text-left p-3 border-b flex justify-between gap-2 hover:bg-[#f8f5ee]"><div className="min-w-0 flex-1"><p className="font-bold text-[13px] truncate">{t.user_a===profile?.full_name ? t.user_b : t.user_a}</p><p className="text-xs opacity-60 truncate">{t.last_message}</p></div><span className="text-[10px] opacity-40">{new Date(t.last_message_at).toLocaleDateString()}</span></button>)}</div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#f8f5ee]">{dmMessages.map((m:any)=>{ const isMe=m.sender_name===profile?.full_name; return (<div key={m.id} className={`max-w-[75%] rounded-2xl px-3 py-2 text-[14px] break-words ${isMe?'bg-[#1a3a2f] text-white ml-auto rounded-br-sm':'bg-white border mr-auto rounded-bl-sm'}`} style={{overflowWrap:'anywhere'}}><p>{m.body}</p><p className={`text-[9px] mt-1 flex justify-end gap-1 ${isMe?'opacity-70':'opacity-40'}`}>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} {isMe && <span className={`font-bold ${m.status==='read'?'text-[#53bdeb]':''}`}>{m.status==='read'?'✓✓': m.status==='delivered'?'✓✓':'✓'}</span>}</p></div>); })}<div ref={dmBottomRef}></div></div>
                <div className="p-2 border-t flex gap-2 bg-white pb-[calc(0.5rem+env(safe-area-inset-bottom))]"><input ref={dmInputRef} value={dmInput} onChange={e=>setDmInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendDM(); }}} placeholder="Message..." className="flex-1 bg-[#f8f5ee] rounded-full px-4 py-3 text-[16px] outline-none min-w-0" enterKeyHint="send" /><button onClick={sendDM} className="bg-[#1a3a2f] text-white px-5 py-3 rounded-full text-sm font-bold">Send</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
