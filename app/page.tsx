'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
export default function Page(){
  const [posts,setPosts]=useState<any[]>([]);
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [addr,setAddr]=useState('304 NE 115TH ST');
  const [zip,setZip]=useState('64155');
  const [mailFile,setMailFile]=useState<File|null>(null);
  const [aiVerifying,setAiVerifying]=useState(false);
  const [aiParsedAddress,setAiParsedAddress]=useState<any>(null);
  const [aiVerified,setAiVerified]=useState(false);
  const [verifyError,setVerifyError]=useState<string|null>(null);
  const [showBluetoothRequest,setShowBluetoothRequest]=useState<{owner:string, address:string}|null>(null);
  useEffect(()=>{
    (async()=>{
      const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(50);
      if(p) setPosts(p);
      const s=typeof window!=='undefined'? localStorage.getItem('nkc_profile_tiered_40')||localStorage.getItem('nkc_profile'):null;
      if(s) try{ setProfile(JSON.parse(s)); }catch{}
    })();
  },[]);
  const handleAiVerify = async()=>{
    if(!mailFile){ setVerifyError('Upload mail photo first'); return; }
    setAiVerifying(true); setVerifyError(null); setAiParsedAddress(null); setAiVerified(false); setShowBluetoothRequest(null);
    try{
      const form = new FormData(); form.append('file', mailFile);
      const res = await fetch('/api/verify-mail',{method:'POST', body:form});
      const j = await res.json();
      if(!res.ok) throw new Error(j.error||'OCR failed');
      const fullAddr = j.full_address||j.full||`${j.street} ${j.zip}`;
      setAiParsedAddress({ street: j.street, zip: j.zip, city: j.city||'KANSAS CITY', full: fullAddr, ocr: j.ocr_text });
      try{
        const checkRes = await fetch('/api/check-address',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({street: j.street, zip: j.zip, full: fullAddr, requester: name})});
        const checkJ = await checkRes.json();
        if(checkJ.alreadyVerified){
          await fetch('/api/alert-address',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({street: j.street, zip: j.zip, full: fullAddr, existingOwner: checkJ.owner, requester: name})});
          setVerifyError(`⚠️ Address "${fullAddr}" already verified by ${checkJ.owner}. Owner alerted.`);
          setShowBluetoothRequest({owner: checkJ.owner, address: fullAddr});
          setAiVerifying(false); return;
        }
      }catch(e){ console.error(e); }
      setAiVerified(true); setAddr(j.street); setZip(j.zip||'64155');
    }catch(e:any){ setVerifyError(`❌ ${e.message}`); } finally{ setAiVerifying(false); }
  };
  const handleJoin = async(type:'zip'|'mail')=>{
    if(!name) return alert('Enter name');
    if(type==='mail'){
      if(!aiVerified||!aiParsedAddress) return alert('Verify mail first');
      try{ await supabase.from('verified_addresses').insert({ street: aiParsedAddress.street, zip: aiParsedAddress.zip, full_address: aiParsedAddress.full, owner_name: name, verified_at: new Date().toISOString() } as any); }catch{}
      const pr={full_name:name,email,street_address:aiParsedAddress.street,zip:aiParsedAddress.zip, tier:'40mile', is_verified:true, via_mail:true};
      localStorage.setItem('nkc_profile_tiered_40',JSON.stringify(pr)); localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false); alert(`✅ Verified! ${aiParsedAddress.full} - 40 mile access unlocked`);
    } else {
      const pr={full_name:name,email,street_address:addr,zip, tier:'5mile', is_verified:false};
      localStorage.setItem('nkc_profile_tiered_40',JSON.stringify(pr)); localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false);
    }
  };
  const handlePost = async()=>{
    if(!profile) return setShowJoin(true);
    if(!body.trim()) return;
    const { data, error } = await supabase.from('posts').insert({ body, category: 'General' }).select().single();
    if(!error) setPosts([{...data, profiles:{full_name:profile.full_name}},...posts]);
    setBody('');
  };
  return (
    <div className="min-h-screen bg-[#f8f5ee]">
      <header className="bg-white border-b sticky top-0 z-20 px-4 py-3 flex justify-between items-center">
        <h1 className="font-black">Neighborly KC {profile?.tier==='40mile'?'🌐40mi':'📍5mi'}</h1>
        <div className="flex gap-2">{profile?<><span className="text-xs">{profile.full_name} - {profile.street_address}</span><Link href="/dms" className="bg-black text-white px-3 py-1 rounded-full text-xs">DMs</Link></>:<button onClick={()=>setShowJoin(true)} className="bg-[#1a3a2f] text-white px-4 py-1.5 rounded-full text-sm font-bold">Join</button>}</div>
      </header>
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        <div className="bg-white rounded-2xl p-4 border"><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Join to post..." className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[80px] text-sm outline-none" /><div className="flex justify-end mt-2"><button onClick={handlePost} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full text-sm font-bold">Post to neighbors</button></div></div>
        {posts.map((p:any)=><div key={p.id} className="bg-white rounded-2xl p-4 border"><p className="text-xs opacity-60">{p.profiles?.full_name||p.author_name} · {p.category}</p><p className="mt-1">{p.body||p.content}</p></div>)}
      </div>
      {showJoin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[24px] sm:rounded-[20px] w-full max-w-[480px] p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4"><h2 className="font-black text-xl">Join Neighborly KC</h2><button onClick={()=>setShowJoin(false)} className="w-8 h-8 rounded-full bg-black/5">✕</button></div>
            <div className="space-y-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name (e.g. Jason Bean)" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/>
              <div className="bg-[#f8f5ee] rounded-xl p-3 border"><p className="font-black text-sm">Option 1: 5 Mile (ZIP only)</p><div className="flex gap-2 mt-2"><input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Street e.g. 304 NE 115TH ST" className="flex-1 bg-white border rounded-xl px-3 py-2.5 text-sm"/><input value={zip} onChange={e=>setZip(e.target.value)} placeholder="ZIP" className="w-[90px] bg-white border rounded-xl px-3 py-2.5 text-sm"/></div></div>
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
                <p className="font-black text-sm text-green-900">Option 2: 40 Mile - FREE OCR (No key!) 📬✅</p>
                <p className="text-[11px] text-green-700 mt-1">Upload envelope. Handles upside-down, extracts 304 NE 115TH ST. No OpenAI needed.</p>
                <input type="file" accept="image/*" onChange={e=>setMailFile(e.target.files?.[0]||null)} className="mt-2 text-xs w-full"/>
                <button disabled={!mailFile||aiVerifying} onClick={handleAiVerify} className="mt-2 w-full bg-green-600 text-white py-2.5 rounded-full font-black text-sm disabled:opacity-30">{aiVerifying?'📖 Reading (free OCR)...':'✅ Verify Mail - FREE'}</button>
                {aiParsedAddress && <div className="mt-2 p-2.5 bg-green-50 border border-green-300 rounded-xl text-[11px]"><p className="font-black text-green-800">✓ Extracted FREE:</p><p className="text-green-700 font-bold">{aiParsedAddress.street} | {aiParsedAddress.zip}</p><p className="text-green-600 text-[10px] mt-1">{aiParsedAddress.full}</p><p className="text-[9px] opacity-50 mt-1">OCR: {aiParsedAddress.ocr?.slice(0,100)}...</p></div>}
                {verifyError && <div className="mt-2 p-2.5 rounded-xl text-[11px] font-bold bg-red-50 border border-red-300 text-red-700 whitespace-pre-wrap">{verifyError}</div>}
                {showBluetoothRequest && <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-300 rounded-xl"><p className="font-black text-[12px] text-blue-900">📲 Bluetooth Tap</p><button onClick={async()=>{ try{ await fetch('/api/request-bluetooth-approval',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({owner: showBluetoothRequest.owner, requester: name, address: showBluetoothRequest.address, street: aiParsedAddress?.street, zip: aiParsedAddress?.zip})}); alert(`Request sent to ${showBluetoothRequest.owner}!`); }catch(e:any){ alert(e.message); } }} className="w-full mt-2 bg-blue-600 text-white py-2.5 rounded-full font-black text-xs">📲 Request Bluetooth Tap</button></div>}
              </div>
            </div>
            <div className="flex gap-2 mt-5"><button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button><button onClick={()=>handleJoin('zip')} className="flex-1 bg-amber-500 py-3 rounded-full font-bold text-sm">5 Mile</button><button disabled={!aiVerified} onClick={()=>handleJoin('mail')} className="flex-1 py-3 rounded-full font-bold text-sm bg-black text-white disabled:opacity-30">40 Mile ✅</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

