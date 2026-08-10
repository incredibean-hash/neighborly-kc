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
          {profile?<span className="text-xs opacity-60">{profile.full_name} {isFounder?'👑':''}</span>:<button onClick={()=>setShowJoin(true)} className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold">Join</button>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur.name}?`:'Join to post...'} className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-3 min-h-[80px] text-sm outline-none text-white placeholder:text-[#666]" />
          <div className="flex justify-end mt-3">
            <button onClick={async()=>{
              if(!profile){setShowJoin(true); return;}
              if(!supabase){alert('Add Supabase keys'); return;}
              if(!body.trim()) return;
              const {data,error}=await supabase.from('posts').insert({body,author_name:profile.full_name,category:'General',neighborhood_id:cur.id}).select().single();
              if(error){alert(error.message); return;}
              setPosts([data,...posts]); setBody('');
            }} className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold">Post</button>
          </div>
        </div>
        {posts.map((p:any)=>(
          <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-2xl">
            <p className="text-xs opacity-50">{p.author_name} {p.is_founder?'👑':''}</p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{p.body}</p>
          </div>
        ))}
      </div>

      {showJoin?(
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-t-[24px] sm:rounded-2xl w-full max-w-[480px] p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-black text-xl">Join {cur.name}</h2>
              <button onClick={()=>{setShowJoin(false); setAddrError('');}} className="w-8 h-8 rounded-full bg-[#2a2a2a]">X</button>
            </div>
            {!isMobile?<div className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs p-3 rounded-xl mb-3">Verification requires phone with Bluetooth. Join allowed, verify later on mobile.</div>:null}
            {canBeFounder?<div className="bg-white text-black text-xs p-3 rounded-xl mb-3 font-bold">Founder spots left: {50-(cur.member_count||0)} — first 50 get FOUNDER badge</div>:null}
            <div className="space-y-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" autoComplete="off" spellCheck={false} className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-3 text-sm text-white outline-none" />
              <div>
                <input value={addr} onChange={e=>{setAddr(e.target.value); setAddrError('');}} placeholder="304 NE 115th St, KC MO 64155" autoComplete="off" autoCorrect="off" spellCheck={false} name="nkc-addr-no-autofill" className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-3 text-sm text-white outline-none" />
                {addrError?<p className="text-red-400 text-xs mt-1">{addrError}</p>:null}
                <button onClick={()=>{localStorage.removeItem('nkc_profile'); localStorage.removeItem('nkc_profile_tiered_40'); setAddr(''); alert('Address removed from this device');}} className="text-[11px] opacity-40 underline mt-1">Remove my address from autofill / this device</button>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#2a2a2a] py-3 rounded-full font-bold text-sm">Cancel</button>
              <button onClick={()=>{
                if(!name.trim()){alert('Name required'); return;}
                if(!isValidKCAddress(addr)){setAddrError('Enter real KC address with number + street name'); return;}
                const founderNum=(cur.member_count||0)+1;
                const isFirst50=founderNum<=50;
                const pr={full_name:name.trim(),street_address:addr.trim(),zip:cur.zip,neighborhood_id:cur.id,is_founder:isFirst50,founder_number:isFirst50?founderNum:null,joined_at:new Date().toISOString()};
                localStorage.setItem('nkc_profile',JSON.stringify(pr));
                localStorage.setItem('nkc_profile_tiered_40',JSON.stringify(pr));
                setProfile(pr); setShowJoin(false); window.location.reload();
              }} className="flex-1 bg-white text-black py-3 rounded-full font-bold text-sm">{canBeFounder?'Join as Founder':'Join'}</button>
            </div>
            <p className="text-[10px] opacity-30 text-center mt-3">No autofill — autocomplete off. Windows: Edge -... - Apps - Install this site as an app</p>
          </div>
        </div>
      ):null}
    </div>
  );
}
