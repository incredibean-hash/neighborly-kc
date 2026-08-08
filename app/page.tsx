"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Events','Lost & Found'];
const KC_ZIPS_5MI = ['64155','64156','64119','64158','64068','64030'];
const KC_ZIPS_40MI = ['64155','64156','64119','64116','64117','64118','64112','64113','64114','64110','64111','64068','64030','64090','64132','64133','64151','64152','64153','64154','64158','64157','64089','64012','64014','64015','64016','64024','64048','64052','64055','64056','64064','64081','64082','64101','64102','64105','64106','64108','64109','64120','64121','64124','64126','64127','64128','64130','64131','64145','64146','66201','66202','66203','66204','66205','66206','66207','66208','66209','66210','66211','66212','66213','66214','66215','66216','66217','66218','66219','66220','66221','66223','66224','66225','66226','66227','66002','66006','66012','66018','66030','66062','66063','64014','64015','64029','64050','64063','64070','64081'];

// Content moderation
const BANNED_WORDS = ["porn", "pornhub", "xvideos", "xnxx", "xhamster", "onlyfans", "fansly", "pornography", "xxx", "nude", "naked", "sex tape", "escort", "prostitute", "hooker", "blowjob", "handjob", "deepthroat", "cum", "cumming", "ejaculate", "orgy", "gangbang", "threesome", "foursome", "anal", "anus", "asshole", "assfuck", "blow job", "boob", "boobs", "tit", "tits", "titties", "pussy", "vagina", "clit", "clitoris", "dick", "cock", "penis", "erection", "hardon", "masturbate", "masturbation", "jerk off", "jack off", "faggot", "fag", "dyke", "tranny", "retard", "retarded", "fuck", "fucking", "fucked", "fucker", "motherfucker", "shit", "bullshit", "cunt", "twat", "cocaine for sale", "heroin for sale", "meth for sale", "buy cocaine", "buy heroin", "nude pics", "send nudes", "sugar daddy", "sugar baby"];
const BANNED_PHRASES = ["send nudes","nude pics","onlyfans.com","sugar daddy","escort service"];
function containsBannedWords(text:string){ const lower=text.toLowerCase(); for(const p of BANNED_PHRASES) if(lower.includes(p)) return true; for(const w of BANNED_WORDS){ if(w.length<=3){ const r=new RegExp(`\\b${w}\\b`,'i'); if(r.test(lower)) return true; } else if(lower.includes(w)) return true; } return false; }
function getBannedWord(text:string): string | null { const lower=text.toLowerCase(); for(const p of BANNED_PHRASES) if(lower.includes(p)) return p; for(const w of BANNED_WORDS){ if(w.length<=3){ const r=new RegExp(`\\b${w}\\b`,'i'); if(r.test(lower)) return w; } else if(lower.includes(w)) return w; } return null; }
async function moderateImage(file:File): Promise<{safe:boolean, reason?:string}>{ if(file.size > 8*1024*1024) return {safe:false, reason:'File too large'}; const allowed=['image/jpeg','image/png','image/webp','image/gif','image/jpg']; if(!allowed.includes(file.type)) return {safe:false, reason:'Only images'}; if(containsBannedWords(file.name)) return {safe:false, reason:'Filename inappropriate'}; try{ const form=new FormData(); form.append('file', file); const res=await fetch('/api/moderate-image',{method:'POST', body:form}); if(res.ok){ const j=await res.json(); if(j.safe===false) return {safe:false, reason:j.reason}; } }catch{} return {safe:true}; }

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
    const d=new Date(iso); const now=new Date(); const diffMs=now.getTime()-d.getTime();
    const diffSec=Math.floor(diffMs/1000); const diffMin=Math.floor(diffSec/60); const diffHr=Math.floor(diffMin/60); const diffDay=Math.floor(diffHr/24);
    let rel=''; if(diffSec<60) rel='Just now'; else if(diffMin<60) rel=`${diffMin}m ago`; else if(diffHr<24) rel=`${diffHr}h ago`; else if(diffDay<7) rel=`${diffDay}d ago`; else rel=d.toLocaleDateString();
    const localTime=d.toLocaleString(undefined,{ month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true });
    return `${rel} • ${localTime}`;
  }catch{ return new Date(iso).toLocaleString(); }
}
function normalizeAddress(s:string){ return s.toLowerCase().replace(/[^a-z0-9]/g,'').trim(); }
function addressesMatch(inputAddr:string, inputZip:string, aiAddr:string, aiZip:string){
  // Strict: zip must match if both present, and street number + name must be similar
  if(!aiAddr) return false;
  const normInput = normalizeAddress(inputAddr);
  const normAi = normalizeAddress(aiAddr);
  // Zip check - must match if user provided zip
  if(inputZip && aiZip && inputZip.trim() !== aiZip.trim()) return false;
  // Street check - if user typed address, it must be contained in AI or vice versa with number match
  if(inputAddr){
    // Extract house number
    const numInput = inputAddr.match(/\d+/)?.[0];
    const numAi = aiAddr.match(/\d+/)?.[0];
    if(numInput && numAi && numInput !== numAi) return false;
    // Check if one contains significant part of other
    if(normInput.length > 5 && normAi.includes(normInput.slice(0,8))) return true;
    if(normAi.length > 5 && normInput.includes(normAi.slice(0,8))) return true;
    // Fallback: at least 60% overlap
    let common=0; for(let i=0;i<Math.min(normInput.length, normAi.length);i++) if(normInput[i]===normAi[i]) common++;
    if(common / Math.max(normInput.length, normAi.length) > 0.6) return true;
    return false;
  }
  // If no user input, accept AI
  return true;
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
  const [aiParsedAddress,setAiParsedAddress]=useState<{street?:string, zip?:string, city?:string, full?:string}>({});
  const [deferredPrompt,setDeferredPrompt]=useState<any>(null);
  const [showInstall,setShowInstall]=useState(false);
  const [showInstallBanner,setShowInstallBanner]=useState(true);
  const [showIosInstallGuide,setShowIosInstallGuide]=useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [dmUnseen,setDmUnseen]=useState(0);
  const [verifyError,setVerifyError]=useState<string|null>(null);
  const [showBluetoothRequest,setShowBluetoothRequest]=useState<{owner:string, address:string}|null>(null);
  const [bluetoothScanning,setBluetoothScanning]=useState(false);
  const markDMsAsRead = ()=>{ if(profile?.full_name){ localStorage.setItem('nkc_dms_last_seen_'+profile.full_name, new Date().toISOString()); setDmUnseen(0); } };

  useEffect(()=>{
    if(typeof document!=='undefined'){
      document.title='Neighborly KC';
      setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
      let m=document.querySelector('meta[name="apple-mobile-web-app-title"]'); if(!m){ m=document.createElement('meta'); (m as any).name='apple-mobile-web-app-title'; document.head.appendChild(m); } (m as any).content='Neighborly KC';
      let m2=document.querySelector('meta[name="application-name"]'); if(!m2){ m2=document.createElement('meta'); (m2 as any).name='application-name'; document.head.appendChild(m2); } (m2 as any).content='Neighborly KC';
      const dismissed=localStorage.getItem('nkc_install_dismissed'); if(dismissed && Date.now() - parseInt(dismissed) < 24*60*60*1000) setShowInstallBanner(false);
    }
    const isStandalone= (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone;
    if(isStandalone) { setShowInstall(false); setShowInstallBanner(false); }
    const handler=(e:any)=>{ e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); setShowInstallBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    const vv = window.visualViewport; const onVvResize = () => { if(!vv) return; setIsKeyboardOpen(vv.height < window.innerHeight * 0.85); };
    const onFocusIn = () => setIsKeyboardOpen(true); const onFocusOut = () => setTimeout(()=>setIsKeyboardOpen(false), 150);
    if(vv) vv.addEventListener('resize', onVvResize); window.addEventListener('focusin', onFocusIn); window.addEventListener('focusout', onFocusOut);
    const t=setTimeout(()=>setShowInstall(true), 1200);
    return()=>{ window.removeEventListener('beforeinstallprompt', handler); clearTimeout(t); if(vv) vv.removeEventListener('resize', onVvResize); window.removeEventListener('focusin', onFocusIn); window.removeEventListener('focusout', onFocusOut); };
  },[]);

  const handleInstall=async()=>{ try{ if(deferredPrompt){ deferredPrompt.prompt(); const {outcome}=await deferredPrompt.userChoice; if(outcome==='accepted'){ setShowInstall(false); setShowInstallBanner(false); setDeferredPrompt(null); localStorage.setItem('nkc_install_dismissed', Date.now().toString()); } return; } setShowIosInstallGuide(true); }catch{ setShowIosInstallGuide(true); } };

  // Load data
  const loadAll = async (postIds:string[]) => {
    if(!postIds.length) return;
    const {data:com}=await supabase.from('comments').select('*').in('post_id', postIds).order('created_at',{ascending:false});
    if(com){
      const g: Record<string,any[]> = {}; com.forEach((c:any)=>{ if(!g[c.post_id]) g[c.post_id]=[]; g[c.post_id].push(c); }); setComments(g);
      const cIds=com.map((c:any)=>c.id);
      if(cIds.length){ const {data:cl}=await supabase.from('likes').select('*').in('comment_id', cIds); if(cl){ const cg: Record<string,any[]> = {}; cl.forEach((l:any)=>{ if(!cg[l.comment_id]) cg[l.comment_id]=[]; cg[l.comment_id].push(l); }); setCLikes(cg); } }
    }
    const {data:lk}=await supabase.from('likes').select('*').in('post_id', postIds).is('comment_id', null);
    if(lk){ const lg: Record<string,any[]> = {}; lk.forEach((l:any)=>{ if(!lg[l.post_id]) lg[l.post_id]=[]; lg[l.post_id].push(l); }); setLikes(lg); }
  };
  useEffect(()=>{ (async()=>{
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false}); if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(50); if(p){ setPosts(p); loadAll(p.map((x:any)=>x.id)); }
    const s=typeof window!=='undefined'? localStorage.getItem('nkc_profile_tiered_40') || localStorage.getItem('nkc_profile'):null; if(s) { try{ setProfile(JSON.parse(s)); }catch{} }
    // DM badge
    try{
      const pr=JSON.parse(localStorage.getItem('nkc_profile_tiered_40')||localStorage.getItem('nkc_profile')||'null');
      if(pr?.full_name){
        const lastSeen=localStorage.getItem('nkc_dms_last_seen_'+pr.full_name);
        const {data:dms}=await supabase.from('dms').select('created_at').eq('to_user', pr.full_name).order('created_at',{ascending:false}).limit(50);
        if(dms){ if(lastSeen){ setDmUnseen(dms.filter((d:any)=> new Date(d.created_at).getTime() > new Date(lastSeen).getTime()).length); } else { setDmUnseen(dms.length); } }
      }
    }catch{}
  })() },[]);

  const cur = hoods.find((x:any)=>x.slug===hood) || hoods[0] || {name:'Meadowbrook', zip:'64155', id: null, slug:'meadowbrook', member_count: 247};
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);
  const isAdmin = profile?.full_name?.toLowerCase().includes('jason');
  const maxRadius = profile?.max_radius || (profile?.is_mail_verified ? 40 : 5);

  // Mail handling with fraud protection
  const handleMailSelect = (f:File)=>{ setMailFile(f); setVerifyError(null); setAiVerified(false); const r=new FileReader(); r.onload=()=>setMailPreview(r.result as string); r.readAsDataURL(f); };

  const handleAiVerify = async()=>{
    if(!mailFile) return;
    setAiVerifying(true); setVerifyError(null);
    try{
      // 1. Moderate image first
      const mod = await moderateImage(mailFile);
      if(!mod.safe){ setVerifyError(mod.reason||'Image flagged'); setAiVerifying(false); return; }

      const form=new FormData(); form.append('file', mailFile);
      const res=await fetch('/api/verify-mail',{method:'POST', body:form});
      const j=await res.json();
      if(!res.ok || !j.success){ throw new Error(j.error||'AI could not read address'); }

      const extractedStreet = j.street || j.address || '';
      const extractedZip = j.zip || '';
      const extractedCity = j.city || '';
      const fullAddr = j.full_address || `${extractedStreet} ${extractedZip}`;

      setAiParsedAddress({street:extractedStreet, zip:extractedZip, city:extractedCity, full:fullAddr});
      setAiExtracted(fullAddr);

      // 2. Compare with user input - REJECT if different
      if(addr.trim() || zip.trim()){
        const match = addressesMatch(addr||'', zip||'', extractedStreet, extractedZip);
        if(!match){
          setVerifyError(`❌ Address mismatch! You entered "${addr} ${zip}" but mail shows "${fullAddr}". Verification rejected. Please enter the address exactly as shown on mail.`);
          setAiVerifying(false);
          return;
        }
      }

      // 3. Check if address already verified by someone else - ALERT owner + offer Bluetooth tap
      try{
        const checkRes = await fetch('/api/check-address',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({street: extractedStreet, zip: extractedZip, full: fullAddr, requester: name})});
        const checkJ = await checkRes.json();
        if(checkJ.alreadyVerified){
          // Alert existing owner via DM + notification table
          await fetch('/api/alert-address',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
            street: extractedStreet, zip: extractedZip, full: fullAddr,
            existingOwner: checkJ.owner,
            requester: name,
            requesterEmail: '',
          })});
          setVerifyError(`⚠️ This address "${fullAddr}" is already verified by ${checkJ.owner}.`);
          setShowBluetoothRequest({owner: checkJ.owner, address: fullAddr});
          setAiVerifying(false);
          return;
        }
      }catch(e){ console.error('check address failed', e); }

      // 4. Passed - auto-fill and lock
      if(extractedStreet) setAddr(extractedStreet);
      if(extractedZip) setZip(extractedZip);
      setAiVerified(true);

    }catch(e:any){ setVerifyError(e.message||'Verification failed'); } finally{ setAiVerifying(false); }
  };

  const handleJoin = async (type:'zip'|'mail')=>{
    if(!name.trim()){ alert('Name required'); return; }
    if(type==='zip'){
      if(!addr.trim() || !zip.trim()){ alert('Address and zip required for 5 mile'); return; }
    }
    if(type==='mail'){
      if(!aiVerified){ alert('Please verify mail with AI first'); return; }
      // Final double-check before saving
      if(!addressesMatch(addr, zip, aiParsedAddress.street||'', aiParsedAddress.zip||'')){
        alert('Address mismatch - cannot join');
        return;
      }
    }
    const pr={full_name:name, street_address:addr, zip, max_radius: type==='mail'?40:5, is_mail_verified: type==='mail', verified_address: aiParsedAddress.full||'', is_founder: (hoods.reduce((a:any,b:any)=>a+(b.member_count||0),0) <50), neighborhood_id:cur?.id};
    localStorage.setItem('nkc_profile_tiered_40', JSON.stringify(pr));
    localStorage.setItem('nkc_profile', JSON.stringify(pr));
    setProfile(pr);
    // Save verified address to DB for fraud detection
    if(type==='mail'){
      try{
        await supabase.from('verified_addresses').insert({ street: aiParsedAddress.street, zip: aiParsedAddress.zip, full_address: aiParsedAddress.full, owner_name: name, verified_at: new Date().toISOString() } as any);
      }catch{}
    }
    setShowJoin(false);
    setAiVerified(false); setMailFile(null); setMailPreview(null); setAiExtracted(''); setAddr(''); setZip('64155'); setName(''); setVerifyError(null);
  };

  const handlePost = async () => {
    if(!profile) return setShowJoin(true);
    if(!body.trim() &&!file) return;
    if(containsBannedWords(body)){ const w=getBannedWord(body); alert(`Post contains inappropriate content: "${w}" - blocked`); return; }
    if(file){ const mod=await moderateImage(file); if(!mod.safe){ alert(mod.reason); return; } }
    if(file && file.size > 3*1024*1024){ alert('Max 3MB!'); return; }
    setUploading(true);
    try{
      let image_url: string | null = null;
      if(file){ const compressed=await compressImage(file); const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`; const {error: upErr}=await supabase.storage.from('post-images').upload(path, compressed); if(upErr) throw upErr; const {data}=supabase.storage.from('post-images').getPublicUrl(path); image_url=data.publicUrl; }
      const realId = hoods.find((x:any)=>x.slug===hood)?.id || cur?.id;
      const { data, error } = await supabase.from('posts').insert({ body, category: cat==='All'? 'General' : cat, neighborhood_id: realId, image_url }).select().single();
      if(error) throw error; setPosts([{...data, profiles:{full_name:profile.full_name}},...posts]); setBody(''); setFile(null); const el = document.getElementById('file-input') as HTMLInputElement; if(el) el.value='';
    } catch(e:any){ alert('Could not save: '+(e.message||e)); } finally{ setUploading(false); }
  };
  const addComment = async (postId:string) => {
    if(!profile) return setShowJoin(true);
    const text=commentText[postId]?.trim(); if(!text) return;
    if(containsBannedWords(text)){ alert('Comment blocked: inappropriate'); return; }
    const {data, error}=await supabase.from('comments').insert({ post_id: postId, content:text, body:text, author_name:profile.full_name }).select().single();
    if(error) return alert(error.message); setComments((prev)=> ({...prev, [postId]: [data,...(prev[postId]||[])]})); setCommentText((prev)=>({...prev,[postId]:''}));
  };
  const togglePostLike = async (postId:string) => {
    if(!profile) return setShowJoin(true);
    const list = likes[postId]||[]; const myLike = list.find((l:any)=>l.author_name===profile.full_name);
    if(myLike){ await supabase.from('likes').delete().eq('id', myLike.id); setLikes((prev)=>{ const next = {...prev}; next[postId]=prev[postId].filter((x:any)=>x.id!==myLike.id); return next; }); }
    else { const {data}=await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name}).select().single(); if(data){ setLikes((prev)=>{ const next = {...prev}; next[postId]=[...(prev[postId]||[]), data]; return next; }); } }
  };
  const toggleCommentLike = async (commentId:string) => {
    if(!profile) return setShowJoin(true);
    const list = cLikes[commentId]||[]; const myLike = list.find((l:any)=>l.author_name===profile.full_name);
    if(myLike){ await supabase.from('likes').delete().eq('id', myLike.id); setCLikes((prev)=>{ const next={...prev}; next[commentId]=prev[commentId].filter((x:any)=>x.id!==myLike.id); return next; }); }
    else { const {data}=await supabase.from('likes').insert({comment_id:commentId, author_name:profile.full_name}).select().single(); if(data){ setCLikes((prev)=>{ const next={...prev}; next[commentId]=[...(prev[commentId]||[]), data]; return next; }); } }
  };
  const deletePost = async (id:string, img:string|null)=>{ if(!confirm('Delete post?')) return; await supabase.from('posts').delete().eq('id', id); if(img){ try{ const p=img.split('/post-images/')[1]; if(p) await supabase.storage.from('post-images').remove([p]); }catch{} } setPosts(posts.filter((p:any)=>p.id!==id)); };
  const deleteComment = async (id:string, postId:string)=>{ if(!confirm('Delete comment?')) return; await supabase.from('comments').delete().eq('id', id); setComments((prev)=>{ const next={...prev}; next[postId]=(next[postId]||[]).filter((c:any)=>c.id!==id); return next; }); };
  const sendDM = async (to:string, msg:string)=>{ if(!profile) return setShowJoin(true); if(!msg.trim()) return; if(containsBannedWords(msg)){ alert('Message blocked'); return; } try{ await supabase.from('dms').insert({ from_user:profile.full_name, to_user:to, message:msg, body:msg } as any); try{ await fetch('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,from:profile.full_name,message:msg})}); }catch{} return true; }catch(e:any){ alert('DM failed: '+e.message); } };
  const [dmSentToast,setDmSentToast]=useState<string|null>(null);
  useEffect(()=>{ if(dmSentToast){ const t=setTimeout(()=>setDmSentToast(null), 3000); return()=>clearTimeout(t); } },[dmSentToast]);

  return (
    <div className="min-h-[100dvh] bg-[#f8f5ee] overflow-x-hidden max-w-[100vw]">
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        html { overflow-x: hidden; height: 100%; }
        body { overflow-x: hidden; max-width: 100vw; height: 100%; overscroll-behavior-y: contain; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        input, textarea, select { font-size: 16px; }
        @media (min-width: 640px) { input, textarea, select { font-size: 14px; } }
      `}</style>

      {showInstall && showInstallBanner && (
        <div className="bg-[#1a3a2f] text-white w-full px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-40 border-b border-white/10 text-[12px] sm:text-sm max-w-[100vw] overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 flex-1"><span className="text-base flex-shrink-0">📲</span><span className="font-bold truncate">Install Neighborly KC — Add to Home Screen</span><span className="hidden sm:inline opacity-60 text-[11px] ml-1 truncate">Saves as Neighborly KC</span></div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto"><button onClick={handleInstall} className="flex-1 sm:flex-none bg-white text-[#1a3a2f] px-3 sm:px-4 py-2 sm:py-1.5 rounded-full font-black text-[12px] sm:text-xs w-full sm:w-auto">Install</button><button onClick={()=>{ setShowInstallBanner(false); localStorage.setItem('nkc_install_dismissed', Date.now().toString()); }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">✕</button></div>
        </div>
      )}

      {isKeyboardOpen && (body.trim() || file) && (
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#1a3a2f] text-white z-[60] px-3 py-2 flex items-center justify-between gap-2 border-b border-white/10">
          <button onClick={()=>{ setBody(''); setFile(null); const el = document.getElementById('file-input') as HTMLInputElement; if(el) el.value=''; setIsKeyboardOpen(false); (document.activeElement as any)?.blur(); }} className="text-[13px] font-bold opacity-80 px-3 py-1.5">Cancel</button>
          <span className="text-[12px] font-bold truncate flex-1 text-center opacity-60">Posting to {cur?.name}</span>
          <button onClick={()=>{ handlePost(); setIsKeyboardOpen(false); (document.activeElement as any)?.blur(); }} disabled={uploading} className="bg-white text-[#1a3a2f] px-5 py-1.5 rounded-full font-black text-[13px]">Post</button>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-30 w-full max-w-[100vw] overflow-hidden">
        <div className="w-full px-3 py-2.5 sm:py-3 flex justify-between items-center gap-2 max-w-[1600px] mx-auto">
          <h1 className="font-black text-[16px] sm:text-xl leading-tight flex-shrink min-w-0 truncate">Neighborly KC <span className="font-bold text-[#0f2b1f] whitespace-nowrap text-[14px] sm:text-xl">- Meadowbrook</span><span className="font-normal text-gray-500 text-[10px] sm:text-sm ml-2 hidden lg:inline">{maxRadius} Mile • {profile?.is_mail_verified?'AI Verified 🤖':'Zip Verified'} • {profile?.zip||'64155'} ✓ {profile?.is_founder && '👑'}</span></h1>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <Link href="/dms" onClick={()=>markDMsAsRead()} className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-[#f8f5ee] border hover:bg-black hover:text-white text-[14px] flex-shrink-0"><span className="translate-y-[-1px]">💬</span>{dmUnseen>0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center font-black animate-pulse">{dmUnseen>9?'9+':dmUnseen}</span>}</Link>
            <button onClick={async()=>{ try{ if(Notification.permission!=='granted') await Notification.requestPermission(); if('serviceWorker' in navigator){ const reg=await navigator.serviceWorker.register('/sw.js'); const sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: VAPID_PUBLIC}); await fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:profile?.full_name, subscription:sub})}); setNotifOn(true); } }catch{} }} className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full text-[14px] sm:text-base flex items-center justify-center border flex-shrink-0 ${notifOn?'bg-green-200':'bg-[#f8f5ee]'}`}>🔔</button>
            {profile ? <button onClick={()=>{ localStorage.clear(); setProfile(null); }} className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-white border font-black text-[11px] sm:text-xs flex-shrink-0">Logout</button> : <button onClick={()=>setShowJoin(true)} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-black text-white font-black text-[11px] sm:text-xs flex-shrink-0">Join</button>}
          </div>
        </div>
        <div className="sm:hidden px-3 pb-2 text-[11px] text-gray-500 truncate max-w-full overflow-hidden">{maxRadius} Mile • {profile?.is_mail_verified?'AI Verified 🤖':'Zip Verified'} • {profile?.zip||'64155'} ✓ {profile?.is_founder && '👑 Founder'}</div>
        <div className="lg:hidden border-t bg-white"><div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto scrollbar-hide max-w-[100vw] touch-pan-x">{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-bold flex-shrink-0 ${cat===c?'bg-[#1a3a2f] text-white':'bg-[#f8f5ee] hover:bg-black/5'}`}>{c}</button>)}</div></div>
      </header>

      <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-3 md:px-6 py-0 sm:py-4 md:py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-0 sm:gap-4 md:gap-6 max-w-[100vw] overflow-hidden">
        <aside className="hidden lg:block bg-white rounded-2xl p-3 h-fit border sticky top-[70px] max-h-[calc(100vh-80px)] overflow-y-auto">
          <p className="text-xs font-bold opacity-40 px-3 py-2">FILTER</p>{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${cat===c?'bg-[#1a3a2f] text-white':'hover:bg-black/5'}`}>{c}</button>)}
          <div className={`mt-4 rounded-xl p-3 border-2 ${maxRadius>=25?'bg-green-50 border-green-300':'bg-amber-50 border-amber-300'}`}><p className="text-[11px] font-black opacity-60">YOUR ACCESS</p><p className="font-black text-sm">{maxRadius===40?'40 Mile Radius 🤖':'5 Mile Radius'}</p><p className="text-[11px] mt-1 break-words">{maxRadius===40?'Mail verified - entire KC Metro':'Zip verified - upgrade with mail for 40mi'}</p>{maxRadius===5 && <button onClick={()=>setShowJoin(true)} className="mt-2 w-full bg-black text-white py-2 rounded-full text-xs font-black">Upgrade to 40 Miles</button>}</div>
          <Link href="/dms" onClick={()=>markDMsAsRead()} className="mt-3 w-full bg-[#f8f5ee] border py-2.5 rounded-full text-xs font-black text-center block relative">💬 Open DM Inbox →{dmUnseen>0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{dmUnseen}</span>}</Link>
        </aside>

        <main className="space-y-0 sm:space-y-3 max-w-[100vw] overflow-hidden pb-0">
          <div className="bg-white sm:rounded-2xl p-3 sm:p-4 border-b sm:border max-w-full overflow-hidden">
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur?.name}?`:'Join Parkwood Hills to post...'} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[80px] text-[16px] sm:text-sm outline-none max-w-full resize-none break-words" rows={3} />
            <div className="flex items-center gap-2 mt-3 max-w-full overflow-hidden"><input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs max-w-[60%] truncate" />{file && <span className="text-[11px] opacity-60 truncate flex-1">{(file.size/1024).toFixed(0)}KB</span>}</div>
            <div className="flex justify-between items-center mt-3 gap-2"><span className="text-[11px] opacity-50 hidden sm:block">{filtered.length} posts</span><button disabled={uploading} onClick={handlePost} className="ml-auto bg-[#1a3a2f] text-white px-5 py-2.5 rounded-full text-sm font-bold disabled:opacity-50 w-full sm:w-auto"> {uploading?'Uploading...':'Post to neighbors'} </button></div>
          </div>

          <div className="lg:hidden bg-white border-b p-3 flex gap-2 overflow-hidden">
            <div className={`flex-1 rounded-xl p-2.5 border-2 ${maxRadius>=25?'bg-green-50 border-green-300':'bg-amber-50 border-amber-300'}`}><p className="text-[10px] font-black opacity-60">ACCESS</p><p className="font-black text-[12px] truncate">{maxRadius===40?'40 Mile 🤖':'5 Mile'}</p></div>
            <Link href="/dms" onClick={()=>markDMsAsRead()} className="flex-1 bg-black text-white rounded-xl p-2.5 text-center flex flex-col items-center justify-center"><span className="font-black text-[12px]">💬 DMs {dmUnseen>0 && `(${dmUnseen})`}</span><span className="text-[10px] opacity-80">Inbox →</span></Link>
          </div>

          {filtered.map((p:any)=>{
            const cList=comments[p.id]||[]; const isOpen=openComments[p.id]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_name===profile?.full_name);
            const isOwner = profile && (p.profiles?.full_name===profile.full_name || p.author_name===profile.full_name); const canDelete = isOwner || isAdmin;
            return (
            <div key={p.id} className="bg-white sm:rounded-2xl p-3 sm:p-4 border-b sm:border max-w-full overflow-hidden">
              <div className="flex justify-between gap-2 max-w-full overflow-hidden"><p className="text-[11px] sm:text-xs font-bold opacity-60 truncate min-w-0 flex-1">{p.profiles?.full_name||p.author_name||'Neighbor'} · {p.category}</p>{canDelete && <button onClick={()=>deletePost(p.id,p.image_url)} className="text-[11px] opacity-40 hover:text-red-600 flex-shrink-0 px-2 py-1 -mr-2">🗑️</button>}</div>
              <p className="mt-1.5 whitespace-pre-wrap break-words break-all text-[14px] sm:text-[15px] leading-[1.4] max-w-full overflow-hidden">{p.body || p.content}</p>
              {p.image_url && <img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[50vh] sm:max-h-[400px] w-full max-w-full object-cover border" loading="lazy" />}
              <p className="text-[11px] opacity-40 mt-2 truncate">{formatRelativeLocal(p.created_at)}</p>
              <div className="mt-3 pt-3 border-t flex gap-4 max-w-full"><button onClick={()=>togglePostLike(p.id)} className={`text-xs font-bold ${liked?'text-red-600':'opacity-60'}`}>{liked?'❤️':'🤍'} {pLikes.length}</button><button onClick={()=>setOpenComments((prev)=>({...prev,[p.id]:!prev[p.id]}))} className="text-xs font-bold opacity-60">💬 {cList.length} {isOpen?'▲':'▼'}</button><button onClick={()=>{ const n=p.profiles?.full_name||p.author_name; if(n && n!==profile?.full_name) setShowDmModal(n); }} className="text-xs font-bold opacity-60">✉️ DM</button></div>
              {isOpen && (
                <div className="mt-3 bg-[#f8f5ee] rounded-xl p-2.5 sm:p-3 space-y-2 max-w-full overflow-hidden">
                  {cList.map((c:any)=>{ const cl=cLikes[c.id]||[]; const cliked=cl.some((l:any)=>l.author_name===profile?.full_name); const canDelC = (profile && c.author_name===profile.full_name) || isAdmin; return (<div key={c.id} className="text-sm bg-white rounded-xl p-2.5 flex justify-between gap-2 max-w-full overflow-hidden"><div className="min-w-0 flex-1"><b className="text-[11px] sm:text-xs">{c.author_name}:</b> <span className="break-words break-all text-[13px] sm:text-sm">{c.content||c.body}</span><button onClick={()=>toggleCommentLike(c.id)} className={`ml-2 text-xs ${cliked?'text-red-600':'opacity-50'}`}>{cliked?'❤️':'🤍'} {cl.length}</button></div>{canDelC && <button onClick={()=>deleteComment(c.id,p.id)} className="text-[10px] opacity-30 hover:text-red-600 flex-shrink-0 ml-2 px-1">🗑️</button>}</div>); })}
                  {cList.length===0 && <p className="text-xs opacity-50">Be first to comment</p>}
                  <div className="flex gap-2 pt-2 max-w-full"><input value={commentText[p.id]||''} onChange={e=>setCommentText((prev)=>({...prev,[p.id]:e.target.value}))} placeholder={profile?'Add comment...':'Join to comment'} className="flex-1 min-w-0 bg-white border rounded-full px-3 py-2.5 text-[16px] sm:text-sm outline-none" /><button onClick={()=>addComment(p.id)} className="bg-[#1a3a2f] text-white px-4 py-2.5 rounded-full text-xs font-bold flex-shrink-0">Reply</button></div>
                </div>
              )}
            </div>
          )})}
        </main>

        <aside className="hidden lg:block bg-white rounded-2xl p-5 border h-fit sticky top-[80px]"><h3 className="font-black truncate">{cur?.name}</h3><p className="text-xs opacity-60 truncate">{cur?.zip} • Kansas City, MO</p><div className="grid grid-cols-2 gap-2 mt-4"><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{cur?.member_count}</b><p className="text-xs">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{posts.length}</b><p className="text-xs">POSTS</p></div></div><Link href="/dms" onClick={()=>markDMsAsRead()} className="mt-3 w-full bg-black text-white py-2.5 rounded-full text-xs font-black text-center block">💬 Open DM Inbox {dmUnseen>0 && <span className="ml-2 bg-red-600 px-2 py-0.5 rounded-full text-[10px]">{dmUnseen} new</span>}</Link></aside>
      </div>

      {showJoin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-3 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-[24px] sm:rounded-[24px] w-full max-w-[560px] p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] my-0 sm:my-8 border-2 max-h-[92vh] sm:max-h-[95vh] overflow-y-auto overscroll-contain">
            <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mb-3 sm:hidden"></div>
            <h2 className="font-black text-lg sm:text-2xl">Join Meadowbrook { (hoods.reduce((a:any,b:any)=>a+(b.member_count||0),0) <50) && <span className="text-amber-500 text-sm">👑 Founder Badge!</span>}</h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
              <div className="border-2 rounded-xl p-2.5 sm:p-3 bg-amber-50 border-amber-200"><p className="font-black text-[12px] sm:text-sm">Zip Verify</p><p className="text-[11px] mt-1">Just address + zip</p><p className="text-[11px] font-black mt-1">→ 5 Mile</p></div>
              <div className="border-2 rounded-xl p-2.5 sm:p-3 bg-green-50 border-green-300"><p className="font-black text-[12px] sm:text-sm">Mail Verify 🤖</p><p className="text-[11px] mt-1">Photo of mail + AI reads address</p><p className="text-[11px] font-black mt-1">→ 40 Mile</p><p className="text-[10px] opacity-60 mt-1 hidden sm:block">Fraud-protected</p></div>
            </div>
            <div className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name *" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-[16px] sm:text-sm max-w-full"/>
              <div className="relative max-w-full"><input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Street - must match mail exactly *" className={`w-full border rounded-xl px-3 py-3 text-[16px] sm:text-sm max-w-full ${aiVerified && addr ? 'bg-green-50 border-green-400' : 'bg-[#f8f5ee]'}`} /><span className="absolute right-3 top-3 text-[10px] opacity-50">AI checks</span></div>
              <div className="relative max-w-full"><input value={zip} onChange={e=>setZip(e.target.value)} placeholder="Zip - must match mail *" className={`w-full border rounded-xl px-3 py-3 text-[16px] sm:text-sm max-w-full ${aiVerified && zip ? 'bg-green-50 border-green-400' : 'bg-[#f8f5ee]'}`} /><span className="absolute right-3 top-3 text-[10px] opacity-50">AI checks</span></div>
              <div className="border-2 border-dashed rounded-xl p-2.5 sm:p-3 bg-[#f8f5ee] max-w-full">
                <p className="font-black text-[11px] sm:text-xs">🔒 Secure AI Mail Verification + Fraud Protection</p>
                <p className="text-[10px] sm:text-[11px] opacity-80 mb-1 break-words">Upload envelope/bill - AI extracts street, zip, city. If your typed address differs from mail, verification FAILS. If address already verified by neighbor, owner is alerted and verification BLOCKED.</p>
                <p className="text-[9px] opacity-60 mb-2">✓ Encrypted • ✓ Address cross-check • ✓ Duplicate alert</p>
                <input type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleMailSelect(f); }} className="w-full text-xs max-w-full"/>
                {mailPreview && <div className="mt-2 max-w-full"><img src={mailPreview} alt="mail" className="w-full rounded-xl max-h-[35vh] object-cover border max-w-full"/><button onClick={handleAiVerify} disabled={aiVerifying} className={`w-full mt-2 py-2.5 rounded-full font-black text-xs ${aiVerified?'bg-green-600 text-white':'bg-black text-white'}`}>{aiVerifying?'🤖 AI Reading & Cross-Checking...': aiVerified?`✓ Verified: ${aiExtracted}`:'🤖 Verify Mail - AI Reads Address'}</button>
                {verifyError && <div className={`mt-2 p-2.5 rounded-xl text-[11px] font-bold break-words ${verifyError.includes('❌')||verifyError.includes('⚠️')?'bg-red-50 border border-red-300 text-red-700':'bg-amber-50 border text-amber-700'}`}>{verifyError}</div>}
                {showBluetoothRequest && (
                  <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-300 rounded-xl">
                    <p className="font-black text-[12px] text-blue-900">📲 Owner verification via Bluetooth Tap</p>
                    <p className="text-[11px] text-blue-800 mt-1">Is {showBluetoothRequest.owner} nearby? Ask them to approve you with a Bluetooth tap. Works when phones are within ~30ft.</p>
                    <div className="flex gap-2 mt-2.5">
                      <button onClick={async()=>{
                        try{
                          setBluetoothScanning(true);
                          // Request owner to approve via DM with bluetooth link
                          await fetch('/api/request-bluetooth-approval',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({owner: showBluetoothRequest.owner, requester: name, address: showBluetoothRequest.address, street: aiParsedAddress.street, zip: aiParsedAddress.zip})});
                          alert(`Request sent to ${showBluetoothRequest.owner}! Ask them to open DMs and tap "Approve via Bluetooth" when you're together.`);
                        }catch(e:any){ alert('Failed: '+e.message); } finally{ setBluetoothScanning(false); }
                      }} className="flex-1 bg-blue-600 text-white py-2.5 rounded-full font-black text-xs active:scale-95">📲 Request Bluetooth Tap</button>
                      <button onClick={()=>{ setShowBluetoothRequest(null); setVerifyError(null); }} className="px-3 py-2.5 bg-white border rounded-full text-xs font-bold">Cancel</button>
                    </div>
                    <p className="text-[9px] opacity-60 mt-2">Owner will get DM with secure approval link</p>
                  </div>
                )}
                {aiVerified && <div className="mt-2 p-2.5 bg-green-50 border border-green-300 rounded-xl text-[11px]"><p className="font-black text-green-800">✓ AI Extracted:</p><p className="text-green-700 break-words">{aiParsedAddress.street} | {aiParsedAddress.zip} {aiParsedAddress.city}</p><p className="text-[10px] text-green-600 mt-1">Matches your input - ready to join. Address will be locked to your account.</p></div>}
                </div>}
              </div>
            </div>
            {aiVerified ? (
              <div className="flex flex-col items-center justify-center gap-3 mt-4 py-6 bg-green-50 rounded-2xl border-2 border-green-300 text-center">
                <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl">✓</div>
                <p className="font-black text-lg text-green-800">Verified & Cross-Checked!</p>
                <p className="text-sm text-green-700 max-w-[320px]">Address matches mail, no duplicate found. 40 mile access unlocked.</p>
                <button onClick={()=>handleJoin('mail')} className="mt-2 bg-[#1a3a2f] text-white px-6 py-3 rounded-full font-black text-sm w-full">Continue to Feed →</button>
              </div>
            ) : (
              <div className="flex gap-2 mt-4 pb-2">
                <button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button>
                <button onClick={()=>handleJoin('zip')} className="flex-1 bg-amber-500 text-black py-3 rounded-full font-bold text-sm">5 Mile</button>
                <button disabled={!name||!addr||!zip} onClick={()=>handleJoin('mail')} className="flex-1 py-3 rounded-full font-bold text-sm bg-black text-white disabled:opacity-30">40 Mile 🤖</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showDmModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[24px] sm:rounded-[20px] w-full max-w-[420px] p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] border-2 shadow-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mb-3 sm:hidden"></div>
            <div className="flex justify-between items-center mb-4"><h3 className="font-black text-lg truncate min-w-0">DM {showDmModal} 🔔</h3><button onClick={()=>{setShowDmModal(null); setDmModalMsg('');}} className="w-8 h-8 rounded-full bg-black/5 font-black flex-shrink-0 ml-2">✕</button></div>
            <textarea value={dmModalMsg} onChange={e=>setDmModalMsg(e.target.value)} placeholder={`Hey ${showDmModal}, ...`} className="w-full border-2 p-4 rounded-2xl text-[16px] sm:text-sm min-h-[100px] resize-none outline-none max-w-full"/>
            <div className="flex gap-2 mt-4"><button onClick={()=>{setShowDmModal(null); setDmModalMsg('');}} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button><button onClick={async()=>{ if(!dmModalMsg.trim()) return; const ok=await sendDM(showDmModal!, dmModalMsg); if(ok){ setDmSentToast(`DM sent to ${showDmModal}`); } setDmModalMsg(''); setShowDmModal(null); }} className="flex-1 bg-black text-white py-3 rounded-full font-bold text-sm">Send</button></div>
            <Link href="/dms" className="mt-3 block text-center text-xs underline">Open inbox →</Link>
          </div>
        </div>
      )}

      {showIosInstallGuide && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setShowIosInstallGuide(false)}>
          <div className="bg-white rounded-t-[24px] sm:rounded-[24px] w-full max-w-[380px] p-5 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl max-w-full overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mb-4 sm:hidden"></div>
            <h3 className="font-black text-lg text-center">{isIOS ? 'Add to Home Screen' : 'Install Neighborly KC'}</h3><p className="text-xs text-center opacity-60 mt-1">Installs as <b>Neighborly KC</b></p>
            {isIOS ? (
              <div className="mt-6 space-y-3"><div className="flex items-center gap-3 bg-[#f8f5ee] rounded-xl p-3"><div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black text-sm">1</div><div className="flex-1 min-w-0"><p className="font-bold text-sm">Tap Share button</p><p className="text-[11px] opacity-60">Bottom of Safari</p></div><span className="text-lg">⬆️</span></div><div className="flex items-center gap-3 bg-[#f8f5ee] rounded-xl p-3"><div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black text-sm">2</div><div className="flex-1"><p className="font-bold text-sm">Tap Add to Home Screen</p></div></div><div className="flex items-center gap-3 bg-[#1a3a2f] text-white rounded-xl p-3"><div className="w-8 h-8 bg-white text-[#1a3a2f] rounded-full flex items-center justify-center font-black text-sm">3</div><div className="flex-1"><p className="font-bold text-sm">Tap Add → Done!</p></div></div></div>
            ) : (
              <div className="mt-6 space-y-3"><div className="flex items-center gap-3 bg-[#f8f5ee] rounded-xl p-3"><div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black text-sm">1</div><div className="flex-1 min-w-0"><p className="font-bold text-sm">Click Install in popup</p></div><span className="text-lg">🖥️</span></div><div className="flex items-center gap-3 bg-[#f8f5ee] rounded-xl p-3"><div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black text-sm">2</div><div className="flex-1"><p className="font-bold text-sm">Click Install to confirm</p></div></div><div className="flex items-center gap-3 bg-[#1a3a2f] text-white rounded-xl p-3"><div className="w-8 h-8 bg-white text-[#1a3a2f] rounded-full flex items-center justify-center font-black text-sm">3</div><div className="flex-1"><p className="font-bold text-sm">Opens like an app!</p></div></div></div>
            )}
            <div className="mt-6 flex gap-2"><button onClick={()=>setShowIosInstallGuide(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Got it</button><button onClick={()=>{ setShowIosInstallGuide(false); setShowInstallBanner(false); localStorage.setItem('nkc_install_dismissed', Date.now().toString()); }} className="flex-1 bg-black text-white py-3 rounded-full font-bold text-sm">Don't show again</button></div>
          </div>
        </div>
      )}
      {dmSentToast && (<div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold z-[200] shadow-xl max-w-[90vw] truncate">{dmSentToast}</div>)}
    </div>
  );
}
