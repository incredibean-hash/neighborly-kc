'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabase(){
  if(typeof window==='undefined') return null;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return null;
  return createClient(url,key);
}

function isValidKCAddress(addr:string){
  if(!addr) return false;
  const a=addr.trim();
  if(a.length<10) return false;
  if(!/\d/.test(a)) return false;
  if(/test|asdf|fake|123 main/i.test(a)) return false;
  if(!/(st|street|ave|avenue|dr|drive|ln|lane|blvd|court|ct|pl|place|rd|road|ter|pkwy)\b/i.test(a)) return false;
  if(a.split(' ').length<3) return false;
  return true;
}

export default function Page(){
  const [supabase,setSupabase]=useState<any>(null);
  const [hoods,setHoods]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState('');
  const [addr,setAddr]=useState('');
  const [mounted,setMounted]=useState(false);
  const [isMobile,setIsMobile]=useState(false);
  const [installPrompt,setInstallPrompt]=useState<any>(null);
  const [showInstall,setShowInstall]=useState(false);
  const [addrError,setAddrError]=useState('');

  useEffect(()=>{
    setMounted(true);
    setSupabase(getSupabase());
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (typeof window!=='undefined' && window.innerWidth<768));
    const s=typeof window!=='undefined'?(localStorage.getItem('nkc_profile')||localStorage.getItem('nkc_profile_tiered_40')):null;
    if(s){try{setProfile(JSON.parse(s))}catch{}}
    const handler=(e:any)=>{e.preventDefault(); setInstallPrompt(e); setShowInstall(true);};
    window.addEventListener('beforeinstallprompt',handler);
    return()=>window.removeEventListener('beforeinstallprompt',handler);
  },[]);

  useEffect(()=>{(async()=>{
    if(!supabase) return;
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false}).limit(20);
    if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(50);
    if(p) setPosts(p);
  })()},[supabase]);

  const cur=hoods[0]||{name:'Parkwood Hills',zip:'64155',id:null,slug:'parkwood-hills',member_count:247};
  const canBeFounder=(cur.member_count||0)<50;
  const isFounder=profile?.is_founder|| (profile?.founder_number&&profile.founder_number<=50);

  if(!mounted){
    return <div className="min-h-screen bg-[#0a0a0a] text-white p-8">Loading Neighborly KC...</div>;
  }

  return(
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5]">
      <header className="bg-[#111] border-b border-[#2a2a2a] sticky top-0 z-20 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-black text-sm">NK</div>
          <h1 className="font-black tracking-tight">Neighborly KC {isFounder?<span className="ml-2 bg-white text-black text-[10px] px-2 py-0.5 rounded-full">FOUNDER</span>:null}</h1>
        </div>
        <div className="flex items-center gap-2">
          {showInstall?<button onClick={async()=>{installPrompt?.prompt(); setShowInstall(false);}} className="bg-white text-black px-3 py-1.5 rounded-full text-xs font-bold">Install (Windows)</button>:null}
          {profile?<span className="text-xs opacity-60">{profile.full_name} {isFounder?'👑':''}</span>:<button onClick={()=>setShowJoin(true)} className="bg-white text-black px
