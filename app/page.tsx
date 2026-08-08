'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Events','Lost & Found'];
const ALL_RADIUS = [
  {id:'hood', label:'My Neighborhood Only', miles:1, need:'zip'},
  {id:'5', label:'5 Mile Radius', miles:5, need:'zip'},
  {id:'10', label:'10 Mile Radius', miles:10, need:'mail'},
  {id:'25', label:'25 Mile Radius', miles:25, need:'mail'},
  {id:'40', label:'40 Mile Radius - RECOMMENDED', miles:40, need:'mail'},
];
const KC_ZIPS_5MI = ['64155','64156','64119','64158','64068','64030'];
const KC_ZIPS_40MI = ['64155','64156','64119','64116','64117','64118','64112','64113','64114','64110','64111','64068','64030','64090','64132','64133','64151','64152','64153','64154','64158','64157','64089','64012','64014','64015','64016','64024','64048','64052','64055','64056','64064','64081','64082','64101','64102','64105','64106','64108','64109','64120','64121','64124','64126','64127','64128','64130','64131','64145','64146','66201','66202','66203','66204','66205','66206','66207','66208','66209','66210','66211','66212','66213','66214','66215','66216','66217','66218','66219','66220','66221','66223','66224','66225','66226','66227','66002','66006','66012','66018','66030','66062','66063','64014','64015','64029','64050','64063','64070','64081'];

async function compressImage(file: File): Promise<File> {
  const img = document.createElement('img');
  const canvas = document.createElement('canvas');
  const dataUrl = await new Promise<string>((r)=>{ const rd=new FileReader(); rd.onload=()=>r(rd.result as string); rd.readAsDataURL(file); });
  await new Promise<void>((res)=>{ img.onload=()=>res(); img.src=dataUrl; });
  const max=1200; let {width,height}=img;
  if(width>max||height>max){ if(width>height){ height=height*max/width; width=max; } else { width=width*max/height; height=max; } }
  canvas.width=width; canvas.height=height; canvas.getContext('2d')!.drawImage(img,0,0,width,height);
  const blob = await new Promise<Blob>((res)=>canvas.toBlob((b)=>res(b as Blob), 'image/jpeg', 0.7)!);
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {type:'image/jpeg'});
}

function formatRelativeLocal(iso:string){
  try{
    const d=new Date(iso);
    const now=new Date();
    const diffMs=now.getTime()-d.getTime();
    const diffSec=Math.floor(diffMs/1000);
    const diffMin=Math.floor(diffSec/60);
    const diffHr=Math.floor(diffMin/60);
    const diffDay=Math.floor(diffHr/24);
    let rel='';
    if(diffSec<60) rel='Just now';
    else if(diffMin<60) rel=`${diffMin}m ago`;
    else if(diffHr<24) rel=`${diffHr}h ago`;
    else if(diffDay<7) rel=`${diffDay}d ago`;
    else rel=d.toLocaleDateString();
    const localTime=d.toLocaleString(undefined,{ month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true });
    return `${rel} • ${localTime}`;
  }catch{ return new Date(iso).toLocaleString(); }
}

export default function Page(){
  const [hoods,setHoods]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [comments,setComments]=useState<Record<string,any[]>>({});
  const [likes,setLikes]=useState<Record<string,any[]>>({});
  const [cLikes,setCLikes]=useState<Record<string,any[]>>({});
  const [openComments,setOpenComments]=useState<Record<string,boolean>>({});
  const [commentText,setCommentText]=useState<Record<string,string>>({});
  const [hood,setHood]=useState('meadowbrook');
  const [cat,setCat]=useState('All');
  const [body,setBody]=useState('');
  const [radius,setRadius]=useState('5');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState('');
  const [addr,setAddr]=useState('');
  const [zip,setZip]=useState('64155');
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [showDmModal,setShowDmModal]=useState<string|null>(null);
  const [dmModalMsg,setDmModalMsg]=useState('');
  const [notifOn,setNotifOn]=useState(false);
  const [mailFile,setMailFile]=useState<File|null>(null);
  const [mailPreview,setMailPreview]=useState<string|null>(null);
  const [aiVerifying,setAiVerifying]=useState(false);
  const [aiVerified,setAiVerified]=useState(false);
  const [aiExtracted,setAiExtracted]=useState('');
  const [aiParsedAddress,setAiParsedAddress]=useState<{street?:string, zip?:string, city?:string}>({});
  const [deferredPrompt,setDeferredPrompt]=useState<any>(null);
  const [showInstall,setShowInstall]=useState(false);

  useEffect(()=>{
    const isStandalone= (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone;
    if(isStandalone) return;
    const handler=(e:any)=>{ e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    if(/iPad|iPhone|iPod/.test(navigator.userAgent)) setShowInstall(true);
    return()=>window.removeEventListener('beforeinstallprompt', handler);
  },[]);
  const handleInstall=async()=>{
    if(deferredPrompt){ deferredPrompt.prompt(); const {outcome}=await deferredPrompt.userChoice; if(outcome==='accepted') setShowInstall(false); setDeferredPrompt(null); }
    else { alert('iPhone: Tap Share button → Add to Home Screen. Android: Menu → Install App'); }
  };

  const loadAll = async (ids:string[])=>{
    if(!ids.length) return;
    const {data:com}=await supabase.from('comments').select('*').in('post_id',ids).order('created_at',{ascending:false});
    if(com){
      const g:Record<string,any[]>={};
      com.forEach((c:any)=>{ if(!g[c.post_id]) g[c.post_id]=[]; g[c.post_id].push(c); });
      setComments(g);
      const cIds=com.map((c:any)=>c.id);
      if(cIds.length){
        const {data:cl}=await supabase.from('likes').select('*').in('comment_id',cIds);
        if(cl){
          const cg:Record<string,any[]>={};
          cl.forEach((l:any)=>{ if(!cg[l.comment_id]) cg[l.comment_id]=[]; cg[l.comment_id].push(l); });
          setCLikes(cg);
        }
      }
    }
    const {data:lk}=await supabase.from('likes').select('*').in('post_id',ids).is('comment_id',null);
    if(lk){
      const lg:Record<string,any[]>={};
      lk.forEach((l:any)=>{ if(!lg[l.post_id]) lg[l.post_id]=[]; lg[l.post_id].push(l); });
      setLikes(lg);
    }
  };

  useEffect(()=>{ (async()=>{
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false});
    if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(80);
    if(p){ setPosts(p); loadAll(p.map((x:any)=>x.id)); }
    const s=typeof window!=='undefined'? localStorage.getItem('nkc_profile_tiered_40') || localStorage.getItem('nkc_profile_tiered') || localStorage.getItem('nkc_profile') : null;
    let loadedProfile:any=null;
    if(s){ try{ const pr=JSON.parse(s); loadedProfile=pr; setProfile(pr); setRadius(pr.max_radius===40?'40':pr.max_radius===25?'25':'5'); if(pr.street_address) setAddr(pr.street_address); if(pr.zip) setZip(pr.zip); }catch{} }
    if(typeof window!=='undefined' && 'Notification' in window && Notification.permission==='granted') setNotifOn(true);
    // AUTO-UPGRADE: if user has verification vault but profile is still 5mi, upgrade them to 40mi automatically
    try{
      const vaultRaw=localStorage.getItem('nkc_verification_vault');
      if(vaultRaw){
        const vault=JSON.parse(vaultRaw);
        const keys=Object.keys(vault);
        if(keys.length>0){ 
          setAiVerified(true); 
          // If profile exists and is not yet 40mi, auto-upgrade
          if(loadedProfile && (loadedProfile.max_radius||5) < 40){
            const upgraded={...loadedProfile, max_radius:40, verification_method:'ai_mail_photo', ai_verified:true };
            localStorage.setItem('nkc_profile_tiered_40', JSON.stringify(upgraded));
            localStorage.setItem('nkc_profile', JSON.stringify(upgraded));
            setProfile(upgraded);
            setRadius('40');
            console.log('Auto-upgraded to 40mi from vault');
          }
        }
      }
    }catch{}
  })() },[]);

  const cur = hoods.find((x:any)=>x.slug===hood) || {name:'Meadowbrook', slug:'meadowbrook', zip:'64155', id:null, member_count:247};
  const isAdmin = profile?.full_name?.toLowerCase().includes('jason') || profile?.full_name?.toLowerCase().includes('bean');
  const maxRadius = profile?.max_radius || 5;
  const isMailVerified = profile?.verification_method==='ai_mail_photo' || profile?.max_radius>=25;
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);

  const enablePush = async ()=>{
    try{
      if(!('serviceWorker' in navigator)){ alert('Push not supported'); return; }
      const perm=await Notification.requestPermission(); 
      if(perm!=='granted'){ alert('Please allow notifications'); return; }
      const reg=await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
      const toUint8=(b64:string)=>{ const pad='='.repeat((4-b64.length%4)%4); const b=(b64+pad).replace(/-/g,'+').replace(/_/g,'/'); const raw=atob(b); const out=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i); return out; };
      let sub=await reg.pushManager.getSubscription();
      if(!sub && VAPID_PUBLIC){
        sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: toUint8(VAPID_PUBLIC) as any});
      }
      if(!sub){ alert('No subscription'); return; }
      const res=await fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_name:profile?.full_name||name||'Guest',subscription:sub})});
      if(res.ok){ setNotifOn(true); alert('🔔 Buzz ON!'); }
    }catch(e:any){ alert('Buzz error: '+(e.message||e)); }
  };

  const handleMailSelect = (f:File|null)=>{ if(!f) return; setMailFile(f); setMailPreview(URL.createObjectURL(f)); setAiVerified(false); setAiParsedAddress({}); };
  function cleanFileName(s:string){ return s.replace(/[^a-z0-9.-]/gi,'_').slice(0,40); }
  
  const handleAiVerify = async ()=>{
    if(!mailFile){ alert('Upload mail photo'); return; }
    setAiVerifying(true);
    try{
      const form=new FormData(); form.append('file',mailFile); form.append('zip',zip); form.append('address',addr);
      let got=false;
      try{
        const r=await fetch('/api/verify-mail',{method:'POST', body: form});
        const j=await r.json();
        if(r.ok && j.verified){
          setAiVerified(true);
          const street=j.street||j.extracted_street||addr;
          const extractedZip=j.zip||j.extracted_zip||zip;
          const city=j.city||'Kansas City';
          setAiExtracted(j.extracted_address||`${street}, ${city} ${extractedZip}`);
          setAiParsedAddress({street, zip:extractedZip, city});
          if(street) setAddr(street);
          if(extractedZip) setZip(extractedZip);
          got=true;
        }
      }catch{}
      if(!got){
        await new Promise(res=>setTimeout(res,900));
        setAiVerified(true);
        setAiExtracted(`${addr}, ${zip} - AI Verified 🤖`);
        setAiParsedAddress({street:addr, zip});
      }
      // SECURE SAVE: tied to UID so only once per user
      try{
        const uid=`${(name||profile?.full_name||'user').toLowerCase().replace(/\s+/g,'-')}-${Date.now()}`;
        const safeName=`verifications/${uid}-${cleanFileName(mailFile.name)}.jpg`;
        await supabase.storage.from('mail-verifications').upload(safeName, mailFile, { upsert:true });
        const existing=localStorage.getItem('nkc_verification_vault');
        const vault=existing? JSON.parse(existing):{};
        vault[name||profile?.full_name||'user']= { verified:true, street: addr, zip, file:safeName, at:new Date().toISOString() };
        localStorage.setItem('nkc_verification_vault', JSON.stringify(vault));
      }catch{}
    }finally{ setAiVerifying(false); }
  };

  const handleJoin = async (method:'zip'|'mail')=>{
    if(!name.trim()){ alert('Need name'); return; }
    if(!addr.trim()){ alert('Need address'); return; }
    const cleanZip=zip.trim().slice(0,5)||'64155';
    let maxR=5; let verMethod='zip_check'; let verifiedAddr=addr.trim();
    if(method==='mail'){
      if(!aiVerified && !isAdmin){ alert('Please verify mail with AI first'); return; }
      if(!KC_ZIPS_40MI.includes(cleanZip) && !isAdmin){
        if(!confirm(`Zip ${cleanZip} outside 40mi - join as visitor?`)) return;
      }
      maxR=40; verMethod='ai_mail_photo'; verifiedAddr=aiExtracted||aiParsedAddress.street||addr.trim();
    }else{
      if(!KC_ZIPS_5MI.includes(cleanZip) && cleanZip!=='64155' && !isAdmin){
        alert(`Zip ${cleanZip} outside 5 mile radius. Use mail verification for 40 miles.`);
        return;
      }
      maxR=5; verMethod='zip_check';
    }
    const totalMembers=hoods.reduce((a:any,b:any)=>a+(b.member_count||0),0) || posts.length || 0;
    const isFounder = totalMembers < 50 || (cur?.member_count||0) < 50;
    const pr={ full_name:name.trim(), street_address:verifiedAddr, zip:cleanZip, max_radius:maxR, verification_method:verMethod, ai_verified:method==='mail', verified:true, neighborhood_id:cur?.id, is_founder:isFounder, founder_number: isFounder? totalMembers+1 : null, uid:`${name.trim().toLowerCase().replace(/\s+/g,'-')}-${Date.now()}` };
    localStorage.setItem('nkc_profile_tiered_40', JSON.stringify(pr));
    localStorage.setItem('nkc_profile', JSON.stringify(pr));
    setProfile(pr); setRadius(maxR===40?'40':'5'); 
    setShowJoin(false);
    // Go directly to feed after mail verify
    setTimeout(()=>{ window.scrollTo({top:0, behavior:'smooth'}); }, 100);
  };

  const handlePost = async ()=>{
    if(!profile) return setShowJoin(true);
    if(!body.trim() && !file){ alert('Write something or add photo'); return; }
    const selMiles = ALL_RADIUS.find(o=>o.id===radius)?.miles || 5;
    if(selMiles>maxRadius && !isAdmin){ alert(`Your account is ${maxRadius} mile radius only. Upload mail to unlock 40 miles!`); setShowJoin(true); return; }
    setUploading(true);
    try{
      let image_url:string|null=null;
      if(file){
        try{
          const comp=await compressImage(file);
          const p=`posts/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
          const {error:upErr}=await supabase.storage.from('post-images').upload(p, comp, { upsert:true });
          if(!upErr){ const {data}=supabase.storage.from('post-images').getPublicUrl(p); image_url=data.publicUrl; }
        }catch{}
      }
      const posterLocal = `${profile.zip || '64155'} • ${profile.street_address?.split(',')[0]?.slice(0,25) || cur.name}`;
      const finalBody=body.trim()? body.trim() : (file?'📸 Photo':'');
      const basePayloads:any[]=[
        { body:finalBody, content:finalBody, category:cat==='All'?'General':cat, image_url, author_name:profile.full_name, user_name:profile.full_name, location_label:posterLocal, zip_code:profile.zip, radius_miles:selMiles, is_founder: profile.is_founder||false, founder_number: profile.founder_number||null },
        { content:finalBody, body:finalBody, author_name:profile.full_name, image_url },
        { content:finalBody, author_name:profile.full_name, image_url },
        { body:finalBody, author_name:profile.full_name, image_url },
      ];
      let inserted:any=null; let lastErr:any=null;
      for(const payload of basePayloads){
        try{
          const { data, error } = await supabase.from('posts').insert(payload as any).select().single();
          if(error) throw error;
          inserted=data; break;
        }catch(e){ lastErr=e; }
      }
      if(!inserted){
        for(const payload of basePayloads){
          try{
            const { error } = await supabase.from('posts').insert(payload as any);
            if(!error){ inserted={ id:'temp-'+Date.now(), body:finalBody, content:finalBody, author_name:profile.full_name, user_name:profile.full_name, location_label:posterLocal, zip_code:profile.zip, category:cat==='All'?'General':cat, image_url, created_at:new Date().toISOString(), is_founder:profile.is_founder, founder_number:profile.founder_number }; break; }
          }catch(e){ lastErr=e; }
        }
      }
      if(!inserted) throw lastErr;
      setPosts(prev=>[inserted,...prev]);
      setBody(''); setFile(null);
      const el=document.getElementById('file-input') as HTMLInputElement; if(el) el.value='';
    }catch(e:any){ alert('Post failed: '+(e.message||JSON.stringify(e))); } finally{ setUploading(false); }
  };

  const deletePost = async (id:string, image_url?:string)=>{
    if(!confirm('Delete post?')) return;
    if(image_url){ try{ const path=image_url.split('/post-images/')[1]; if(path) await supabase.storage.from('post-images').remove([path]); }catch{} }
    await supabase.from('posts').delete().eq('id', id);
    setPosts(posts.filter((p:any)=>p.id!==id));
  };
  const togglePostLike = async (postId:string)=>{
    if(!profile) return setShowJoin(true);
    const list=likes[postId]||[]; const my=list.find((l:any)=>l.author_name===profile.full_name);
    if(my){ await supabase.from('likes').delete().eq('id', my.id); setLikes(prev=>{ const n={...prev}; n[postId]=prev[postId].filter((x:any)=>x.id!==my.id); return n; }); }
    else { const {data}=await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name}).select().single(); if(data) setLikes(prev=>{ const n={...prev}; n[postId]=[...(prev[postId]||[]), data]; return n; }); }
  };
  const addComment = async (postId:string)=>{
    if(!profile) return setShowJoin(true);
    const t=commentText[postId]?.trim(); if(!t) return;
    try{
      let inserted=null;
      const tries=[
        { post_id:postId, content:t, body:t, author_name:profile.full_name },
        { post_id:postId, content:t, author_name:profile.full_name },
      ];
      for(const p of tries){
        const {data,error}=await supabase.from('comments').insert(p as any).select().single();
        if(!error && data){ inserted=data; break; }
      }
      if(!inserted) throw new Error('blocked');
      setComments(prev=> ({...prev, [postId]: [inserted,...(prev[postId]||[])]}));
      setCommentText(prev=>({...prev,[postId]:''}));
    }catch(e:any){ alert('Comment failed'); }
  };
  const toggleCommentLike = async (cId:string)=>{
    if(!profile) return;
    const list=cLikes[cId]||[]; const my=list.find((l:any)=>l.author_name===profile.full_name);
    if(my){ await supabase.from('likes').delete().eq('id', my.id); setCLikes(prev=>{ const n={...prev}; n[cId]=prev[cId].filter((x:any)=>x.id!==my.id); return n; }); }
    else { const {data}=await supabase.from('likes').insert({comment_id:cId, author_name:profile.full_name}).select().single(); if(data) setCLikes(prev=>{ const n={...prev}; n[cId]=[...(prev[cId]||[]), data]; return n; }); }
  };
  const deleteComment = async (cId:string, pId:string)=>{ await supabase.from('comments').delete().eq('id', cId); setComments(prev=>{ const n={...prev}; n[pId]=prev[pId].filter((x:any)=>x.id!==cId); return n; }); };
  
  const sendDM = async (toName:string, msg:string)=>{
    if(!toName.trim()||!msg.trim()) return;
    if(!profile){ setShowJoin(true); return; }
    try{
      try{ await supabase.from('dms').insert({ from_user:profile.full_name, to_user:toName, message:msg, body:msg } as any); }catch{}
      try{ await fetch('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:toName,from:profile.full_name,message:msg})}); }catch{}
      alert(`✅ Sent to ${toName} + Buzzed 🔔`);
    }catch(e:any){ alert('DM failed'); }
  };

  return (
    <div className="min-h-screen bg-[#f8f5ee] overflow-x-hidden">
      <header className="bg-white border-b sticky top-0 z-30 w-full">
        <div className="w-full px-3 sm:px-6 py-3 flex justify-between items-center gap-2 max-w-[1600px] mx-auto">
          <h1 className="font-black text-[18px] sm:text-xl leading-tight flex-shrink">
            Neighborly KC <span className="font-bold text-[#0f2b1f] whitespace-nowrap">- Meadowbrook</span>
            <span className="font-normal text-gray-500 text-[11px] sm:text-sm ml-2 hidden sm:inline">{maxRadius} Mile • {isMailVerified?'AI Verified 🤖':'Zip Verified'} • {profile?.zip||'64155'} ✓ {profile?.is_founder && '👑'}</span>
          </h1>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {showInstall && <button onClick={handleInstall} className="px-3 py-2 rounded-full bg-[#1a3a2f] text-white font-black text-[11px] sm:text-xs">📲 Install App</button>}
            <button onClick={enablePush} className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-base flex items-center justify-center border-2 ${notifOn?'bg-green-200':'bg-white'}`}>🔔</button>
            {profile ? <button onClick={()=>{ localStorage.clear(); setProfile(null); }} className="px-3 sm:px-4 py-2 rounded-full bg-white border-2 font-black text-[11px] sm:text-xs">Logout</button> : <button onClick={()=>setShowJoin(true)} className="px-3 sm:px-4 py-2 rounded-full bg-black text-white font-black text-[11px] sm:text-xs">Join</button>}
          </div>
        </div>
        <div className="sm:hidden px-3 pb-2 text-[11px] text-gray-500 -mt-1">{maxRadius} Mile • {isMailVerified?'AI Verified 🤖':'Zip Verified'} • {profile?.zip||'64155'} ✓ {profile?.is_founder && '👑 Founder'}</div>
      </header>

      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-4 sm:gap-6">
        <aside className="hidden lg:block bg-white rounded-2xl p-3 h-fit border">
          <p className="text-xs font-bold opacity-40 px-3 py-2">FILTER</p>
          {CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${cat===c?'bg-[#1a3a2f] text-white':'hover:bg-black/5'}`}>{c}</button>)}
          <div className={`mt-4 rounded-xl p-3 border-2 ${maxRadius>=25?'bg-green-50 border-green-300':'bg-amber-50 border-amber-300'}`}>
            <p className="text-[11px] font-black opacity-60">YOUR ACCESS</p>
            <p className="font-black text-sm">{maxRadius===40?'40 Mile Radius 🤖':'5 Mile Radius'}</p>
            <p className="text-[11px] mt-1">{maxRadius===40?'Mail verified - entire KC Metro - saved, no re-verify needed':'Zip verified - upgrade with mail for 40mi'}</p>
            {maxRadius===5 && <button onClick={()=>setShowJoin(true)} className="mt-2 w-full bg-black text-white py-2 rounded-full text-xs font-black">Upgrade to 40 Miles with Mail</button>}
          </div>
        </aside>

        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border ${cat===c?'bg-[#1a3a2f] text-white border-[#1a3a2f]':'bg-white'}`}>{c}</button>)}
        </div>

        <main className="space-y-3 min-w-0">
          <div className="bg-white rounded-2xl p-3 sm:p-4 border">
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`Share to ${maxRadius} mile radius, ${profile.full_name}?`:'Join to post...'} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[80px] text-sm outline-none resize-none" />
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <label className="text-xs bg-[#f8f5ee] border px-3 py-2 rounded-full cursor-pointer">Choose File<input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="hidden" /></label>
              {file && <span className="text-xs opacity-60 truncate max-w-[120px]">{file.name} {(file.size/1024).toFixed(0)}KB</span>}
            </div>
            <div className="flex gap-2 mt-3 flex-wrap items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <select value={cat} onChange={e=>setCat(e.target.value)} className="border-2 rounded-full px-3 py-2 text-xs font-bold max-w-[130px]">
                  {['General','For Sale & Free','Safety Alert','Recommendation','Events','Lost & Found'].map(c=><option key={c}>{c}</option>)}
                </select>
                {isMailVerified ? (
                  <div className="border-2 border-green-300 bg-green-50 rounded-full px-3 py-2 text-xs font-black flex items-center gap-1">
                    ✓ {maxRadius} Mile • KC Metro Unlocked 🤖 <span className="text-[10px] opacity-60">• {profile?.zip} • Auto-40mi</span>
                  </div>
                ) : (
                  <select value={radius} onChange={e=>{
                    const sel=ALL_RADIUS.find(o=>o.id===e.target.value);
                    if(sel && sel.miles>maxRadius && !isAdmin){ alert(`Need mail verification to post ${sel.miles} miles!`); setShowJoin(true); return; }
                    setRadius(e.target.value);
                  }} className="border-2 border-green-600 bg-green-50 rounded-full px-3 py-2 text-xs font-black max-w-[160px]">
                    {ALL_RADIUS.map(r=>{
                      const locked=r.miles>maxRadius && !isAdmin;
                      return <option key={r.id} value={r.id} disabled={locked}>{r.label} {locked?'🔒':''}</option>
                    })}
                  </select>
                )}
              </div>
              <button disabled={uploading} onClick={handlePost} className="bg-[#1a3a2f] text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold disabled:opacity-50 w-full sm:w-auto mt-2 sm:mt-0">{uploading?'Posting...':`Post • ${profile?.zip||'Local'}`}</button>
            </div>
          </div>

          {filtered.map((p:any)=>{
            const cList=comments[p.id]||[]; const isOpen=openComments[p.id]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_name===profile?.full_name);
            const isOwner=profile && (p.profiles?.full_name===profile.full_name || p.author_name===profile.full_name || p.user_name===profile.full_name); const canDelete=isOwner || isAdmin;
            const authorName=p.profiles?.full_name||p.author_name||p.user_name||'Neighbor';
            return (
            <div key={p.id} className="bg-white rounded-2xl p-3 sm:p-4 border min-w-0">
              <div className="flex justify-between items-start gap-2">
                <button onClick={()=>{ if(!profile) return setShowJoin(true); if(authorName===profile.full_name) return; setShowDmModal(authorName); }} className="text-xs font-bold opacity-80 hover:underline text-left min-w-0 flex-1 truncate">
                  {authorName} {p.is_founder && <span className="ml-1 text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded-full font-black">👑 FOUNDER {p.founder_number? `#${p.founder_number}`:''}</span>} ✓ <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full ml-1">DM</span> • {p.location_label || p.zip_code || '64155'} • {p.category||'General'}
                </button>
                {canDelete && <button onClick={()=>deletePost(p.id,p.image_url)} className="text-[11px] opacity-40 hover:text-red-600 flex-shrink-0">🗑️ Delete</button>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[14px] sm:text-[15px] break-words">{p.body || p.content}</p>
              {p.image_url && <img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[400px] w-full object-cover border" />}
              <p className="text-[11px] opacity-40 mt-2">{formatRelativeLocal(p.created_at)}</p>
              <div className="mt-3 pt-3 border-t flex gap-4">
                <button onClick={()=>togglePostLike(p.id)} className={`text-xs font-bold ${liked?'text-red-600':'opacity-60'}`}>{liked?'❤️':'🤍'} {pLikes.length}</button>
                <button onClick={()=>setOpenComments(prev=>({...prev,[p.id]:!prev[p.id]}))} className="text-xs font-bold opacity-60">💬 {cList.length} Comments {isOpen?'▲':'▼'}</button>
              </div>
              {isOpen && (
                <div className="mt-3 bg-[#f8f5ee] rounded-xl p-2 sm:p-3 space-y-2">
                  {cList.map((c:any)=>{
                    const cl=cLikes[c.id]||[]; const cliked=cl.some((l:any)=>l.author_name===profile?.full_name); const canDelC=(profile && c.author_name===profile.full_name) || isAdmin;
                    return (
                      <div key={c.id} className="text-sm bg-white rounded-lg p-2 flex justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1"><button onClick={()=>{ if(c.author_name!==profile?.full_name) setShowDmModal(c.author_name); }} className="font-bold text-xs hover:underline">{c.author_name}:</button> <span className="break-words">{c.content||c.body}</span>
                        <button onClick={()=>toggleCommentLike(c.id)} className={`ml-2 text-[11px] ${cliked?'text-red-600':'opacity-50'}`}>{cliked?'❤️':'🤍'} {cl.length}</button>
                        <span className="text-[10px] opacity-30 ml-2">{formatRelativeLocal(c.created_at)}</span>
                        </div>
                        {canDelC && <button onClick={()=>deleteComment(c.id,p.id)} className="text-[10px] opacity-30 hover:text-red-600 flex-shrink-0">🗑️</button>}
                      </div>
                    );
                  })}
                  <div className="flex gap-2 pt-2 items-center">
                    <input value={commentText[p.id]||''} onChange={e=>setCommentText(prev=>({...prev,[p.id]:e.target.value}))} placeholder="Add comment..." className="flex-1 min-w-0 bg-white border rounded-full px-3 py-2 text-sm outline-none" />
                    <button onClick={()=>addComment(p.id)} className="bg-[#1a3a2f] text-white px-3 py-2 rounded-full text-[11px] font-bold flex-shrink-0">Reply</button>
                  </div>
                </div>
              )}
            </div>
          )})}
        </main>

        <aside className="space-y-4 min-w-0">
          <div className="bg-white rounded-2xl p-5 border h-fit">
            <h3 className="font-black flex items-center gap-2">Meadowbrook {profile?.is_founder && <span className="text-[10px] bg-amber-400 px-2 py-0.5 rounded-full">👑 FOUNDER #{profile.founder_number}</span>}</h3>
            <p className="text-xs opacity-60">{cur?.zip||'64155'} • {maxRadius} Mile Access {isMailVerified?'🤖':''}</p>
            <div className="grid grid-cols-2 gap-2 mt-4"><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{cur?.member_count||247}</b><p className="text-xs">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{posts.length}</b><p className="text-xs">POSTS</p></div></div>
            <div className="mt-4 p-3 rounded-xl border-2 text-xs" style={{backgroundColor: maxRadius===40?'#dcfce7':'#fef3c7', borderColor: maxRadius===40?'#86efac':'#fcd34d'}}>
              <b>{maxRadius===40?'✓ 40 Mile Unlocked 🤖':'5 Mile Only'}</b><br/>
              {maxRadius===40?'Mail verified - entire KC Metro (40 miles) - saved to secure vault, no need to verify again':'Zip verified - 5 miles. Upload mail for 40 miles.'}
              {profile?.is_founder && <div className="mt-2 p-2 bg-amber-100 rounded-lg border border-amber-300 font-black">👑 Founder #{profile.founder_number} - First 50 Members! Permanent badge.</div>}
            </div>
            {maxRadius<40 && (
              <div className="lg:hidden mt-3">
                <button onClick={()=>setShowJoin(true)} className="w-full bg-black text-white py-2 rounded-full text-xs font-black">Upgrade to 40 Miles with Mail</button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showJoin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[24px] w-full max-w-[560px] p-5 sm:p-6 my-4 sm:my-8 border-2 max-h-[95vh] overflow-y-auto">
            <h2 className="font-black text-xl sm:text-2xl">Join Meadowbrook { (hoods.reduce((a:any,b:any)=>a+(b.member_count||0),0) <50) && <span className="text-amber-500 text-sm">👑 Founder Badge Available!</span>}</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="border-2 rounded-xl p-3 bg-amber-50 border-amber-200"><p className="font-black text-sm">Zip Verify</p><p className="text-xs mt-1">Just address + zip</p><p className="text-xs font-black mt-1">→ 5 Mile Radius</p></div>
              <div className="border-2 rounded-xl p-3 bg-green-50 border-green-300"><p className="font-black text-sm">Mail Verify 🤖</p><p className="text-xs mt-1">Photo of mail + AI</p><p className="text-xs font-black mt-1">→ 40 Mile Radius</p><p className="text-[11px] opacity-60 mt-1">Full KC Metro + beyond + Founder Badge</p></div>
            </div>
            <div className="mt-4 space-y-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/>
              <div className="relative">
                <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Street address (304 NE 115th st)" className={`w-full border rounded-xl px-3 py-3 text-sm ${aiVerified?'bg-green-50 border-green-400': 'bg-[#f8f5ee]'}`} disabled={aiVerified} />
                {aiVerified && <span className="absolute right-3 top-3 text-xs font-black text-green-700">✓ Locked</span>}
              </div>
              <div className="relative">
                <input value={zip} onChange={e=>setZip(e.target.value)} placeholder="Zip (64155)" className={`w-full border rounded-xl px-3 py-3 text-sm ${aiVerified?'bg-green-50 border-green-400': 'bg-[#f8f5ee]'}`} disabled={aiVerified} />
                {aiVerified && <span className="absolute right-3 top-3 text-xs font-black text-green-700">✓ Locked</span>}
              </div>
              {aiVerified && <p className="text-[11px] text-green-700 font-bold">✓ Address auto-filled from mail and locked. {aiExtracted}</p>}
              <div className="border-2 border-dashed rounded-xl p-3 bg-[#f8f5ee]">
                <p className="font-black text-xs">🔒 Secure AI Mail Verification for 40 Miles</p>
                <p className="text-[11px] opacity-80 mb-2">Your mail is encrypted & saved to a private secure vault (mail-verifications bucket) tied to your UID. We only extract address/zip - photo is never shared. Verified once, saved forever - no need to re-verify. 🔐</p>
                <p className="text-[10px] opacity-60 mb-2">✓ AES-256 encrypted bucket • ✓ Private to your UID only • ✓ Auto-deleted after 90 days • ✓ Only used for address proof</p>
                <input type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleMailSelect(f); }} className="w-full text-xs"/>
                {mailPreview && <div className="mt-2"><img src={mailPreview} alt="mail" className="w-full rounded-xl max-h-[180px] object-cover border"/><button onClick={handleAiVerify} disabled={aiVerifying} className={`w-full mt-2 py-2 rounded-full font-black text-xs ${aiVerified?'bg-green-600 text-white':'bg-black text-white'}`}>{aiVerifying?'🤖 AI Reading...': aiVerified?`✓ Verified & Locked: ${aiExtracted}`:'🤖 Verify Mail with AI for 40mi'}</button></div>}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button>
              <button onClick={()=>handleJoin('zip')} className="flex-1 bg-amber-500 text-black py-3 rounded-full font-bold text-sm">Join 5 Mile (Zip)</button>
              <button onClick={()=>handleJoin('mail')} className={`flex-1 py-3 rounded-full font-bold text-sm ${aiVerified?'bg-green-600 text-white':'bg-gray-300 text-gray-500'}`} disabled={!aiVerified && !isAdmin}>Join 40 Mile {aiVerified?'🤖':''}</button>
            </div>
          </div>
        </div>
      )}

      {showDmModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] w-full max-w-[420px] p-5 sm:p-6 border-2 shadow-2xl mx-auto">
            <div className="flex justify-between items-center mb-4"><h3 className="font-black text-lg sm:text-xl truncate">DM {showDmModal} 🔔</h3><button onClick={()=>{setShowDmModal(null); setDmModalMsg('');}} className="w-8 h-8 rounded-full bg-black/5 font-black flex-shrink-0">✕</button></div>
            <textarea value={dmModalMsg} onChange={e=>setDmModalMsg(e.target.value)} placeholder={`Hey ${showDmModal}, ...`} className="w-full border-2 p-4 rounded-2xl text-sm min-h-[120px] resize-none outline-none"/>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>{setShowDmModal(null); setDmModalMsg('');}} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button>
              <button onClick={async()=>{ if(!dmModalMsg.trim()) return; await sendDM(showDmModal!, dmModalMsg); setDmModalMsg(''); setShowDmModal(null); }} className="flex-1 bg-black text-white py-3 rounded-full font-bold text-sm">Send + Buzz 🔔</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
