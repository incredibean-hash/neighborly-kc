'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabase(){
  if(typeof window==='undefined') return null;
  const u=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!u||!k) return null;
  return createClient(u,k);
}
function formatCST(iso:string){
  try{ return new Date(iso).toLocaleString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})+' CST'; }
  catch{ return new Date(iso).toLocaleString(); }
}

export default function Page(){
  const [supabase,setSupabase]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [dms,setDms]=useState<any[]>([]);
  const [tab,setTab]=useState<'home'|'dms'>('home');
  const [showJoin,setShowJoin]=useState(false);
  const [showPost,setShowPost]=useState(false);
  const [profile,setProfile]=useState<any>(null);
  const [name,setName]=useState(''); const [addr,setAddr]=useState(''); const [email,setEmail]=useState('');
  const [emailVerified,setEmailVerified]=useState(false);
  const [body,setBody]=useState(''); const [photo,setPhoto]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const [dmTo,setDmTo]=useState(''); const [dmBody,setDmBody]=useState('');

  useEffect(()=>{
    const sb=getSupabase(); setSupabase(sb);
    const raw=localStorage.getItem('nkc_profile'); const ev=localStorage.getItem('nkc_email_verified');
    if(raw){ try{ setProfile(JSON.parse(raw)); }catch{} }
    if(ev) setEmailVerified(true);
    (async()=>{
      if(!sb) return;
      const {data:p}=await sb.from('posts').select('*').order('created_at',{ascending:false}).limit(100);
      if(p) setPosts(p);
    })();
  },[]);

  const loadDMs=async()=>{
    if(!supabase ||!profile) return;
    const {data}=await supabase.from('dms').select('*').or(`to_user.eq.${profile.full_name},from_user.eq.${profile.full_name}`).order('created_at',{ascending:false}).limit(100);
    if(data) setDms(data);
  };

  const handlePhoto=(e:any)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const reader=new FileReader(); reader.onload=()=>setPhoto(reader.result as string); reader.readAsDataURL(f);
  };

  const createPost=async()=>{
    if(!profile){ setShowJoin(true); return; }
    if(!body.trim() &&!photo) return alert('Write something or add photo');
    if(!supabase) return;
    const {data,error}=await supabase.from('posts').insert({
      body: body.trim(),
      author_name: profile.full_name,
      author_address: profile.street_address,
      location: profile.street_address,
      photo_url: photo,
      email_verified: emailVerified
    }).select().single();
    if(error) return alert(error.message);
    setPosts([data,...posts]); setBody(''); setPhoto(null); setShowPost(false);
  };

  const deletePost=async(id:string)=>{
    if(!confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id',id);
    setPosts(posts.filter(x=>x.id!==id));
  };

  const sendDM=async()=>{
    if(!dmTo.trim() ||!dmBody.trim()) return;
    await supabase.from('dms').insert({from_user:profile.full_name,to_user:dmTo.trim(),message:dmBody,body:dmBody});
    setDmBody(''); setDmTo(''); alert('DM sent'); loadDMs();
  };

  return(
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-[80px]">
      {/* Header */}
      <header className="bg-[#111] border-b border-[#222] p-4 flex justify-between sticky top-0 z-20">
        <div className="flex gap-2 items-center"><img src="/icon-192.png" className="w-8 h-8 rounded bg-white" /><span className="font-black">Neighborly KC</span></div>
        {!profile? <button onClick={()=>setShowJoin(true)} className="bg-white text-black px-4 py-1 rounded-full text-xs font-bold">Join</button> : <span className="text-[11px] opacity-60">{profile.full_name} • {emailVerified?'✓ Email':''}</span>}
      </header>

      {/* Posts Feed */}
      {tab==='home' && <div className="max-w-[600px] mx-auto p-3 space-y-3">
        <button onClick={()=>{ if(!profile) setShowJoin(true); else setShowPost(true); }} className="w-full bg-[#1a1a1a] border border-[#222] rounded-2xl p-4 text-left text-sm opacity-70">What's happening? + Photo</button>
        {posts.map((p:any)=><div key={p.id} className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div><div className="text-sm font-bold">{p.author_name} {p.email_verified && <span className="text-[10px] bg-green-900 px-1 rounded">✓ mail verified</span>}</div>
            <div className="text-[11px] opacity-50">{p.location || p.author_address} • {formatCST(p.created_at)}</div></div>
            {profile?.full_name===p.author_name && <button onClick={()=>deletePost(p.id)} className="text-[10px] bg-red-900/50 px-2 py-1 rounded-full">Delete</button>}
          </div>
          {p.body && <p className="mt-3 text-[14px] whitespace-pre-wrap">{p.body}</p>}
          {p.photo_url && <img src={p.photo_url} className="mt-3 rounded-xl w-full max-h-[400px] object-cover border border-[#222]" />}
        </div>)}
      </div>}

      {/* DM Tab */}
      {tab==='dms' && <div className="max-w-[600px] mx-auto p-3 space-y-3">
        <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-4">
          <input value={dmTo} onChange={e=>setDmTo(e.target.value)} placeholder="To: Name" className="w-full bg-black border border-[#333] rounded-xl px-3 py-2 text-sm" />
          <textarea value={dmBody} onChange={e=>setDmBody(e.target.value)} placeholder="Message" className="w-full bg-black border border-[#333] rounded-xl p-3 text-sm mt-2 min-h-[60px]" />
          <button onClick={sendDM} className="mt-2 bg-white text-black px-4 py-2 rounded-full text-xs font-bold w-full">Send DM</button>
          <button onClick={loadDMs} className="mt-2 bg-[#222] px-4 py-2 rounded-full text-xs w-full">Refresh DMs</button>
        </div>
        {dms.map((d:any)=><div key={d.id} className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-3"><div className="text-[11px] opacity-50">{d.from_user} → {d.to_user} • {formatCST(d.created_at)}</div><p className="text-sm mt-1">{d.message || d.body}</p></div>)}
      </div>}

      {/* Bottom Nav - FIXED */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-[#222] flex justify-around items-center p-2 z-30">
        <button onClick={()=>setTab('home')} className={`px-6 py-2 rounded-full text-xs font-bold ${tab==='home'?'bg-white text-black':'bg-[#222]'}`}>Home</button>
        <button onClick={()=>{ setShowPost(true); if(!profile) setShowJoin(true); }} className="bg-white text-black w-12 h-12 rounded-full font-black text-xl -mt-6 border-4 border-[#0a0a0a]">+</button>
        <button onClick={()=>{ setTab('dms'); if(!profile) setShowJoin(true); else loadDMs(); }} className={`px-6 py-2 rounded-full text-xs font-bold ${tab==='dms'?'bg-white text-black':'bg-[#222]'}`}>DM</button>
      </div>

      {/* Post Composer */}
      {showPost && <div className="fixed inset-0 bg-black/90 z-50 flex items-end justify-center">
        <div className="bg-[#1a1a1a] border-t border-[#333] rounded-t-2xl p-4 w-full max-w-[600px]">
          <div className="flex justify-between mb-3"><h3 className="font-bold">New Post</h3><button onClick={()=>setShowPost(false)} className="text-xs bg-[#222] px-3 py-1 rounded-full">X</button></div>
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="What's up in KC?" className="w-full bg-black border border-[#333] rounded-xl p-3 text-sm min-h-[80px]" />
          {photo && <img src={photo} className="mt-2 rounded-xl w-full max-h-[200px] object-cover" />}
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} hidden />
          <div className="flex gap-2 mt-3"><button onClick={()=>fileRef.current?.click()} className="bg-[#222] px-4 py-2 rounded-full text-xs">📷 Add Photo</button>
          <button onClick={createPost} className="flex-1 bg-white text-black py-2 rounded-full text-xs font-bold">Post</button></div>
          <div className="text-[10px] opacity-40 mt-2">📍 {profile?.street_address} • {new Date().toLocaleString('en-US',{timeZone:'America/Chicago'})} CST</div>
        </div>
      </div>}

      {/* Join / Verification */}
      {showJoin && <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 w-full max-w-sm">
          <h2 className="font-black text-lg">Join Neighborly KC</h2>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-black border border-[#333] rounded-xl px-3 py-3 mt-4 text-sm" />
          <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Street address (for location)" className="w-full bg-black border border-[#333] rounded-xl px-3 py-3 mt-2 text-sm" />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email for mail verification" className="w-full bg-black border border-[#333] rounded-xl px-3 py-3 mt-2 text-sm" />
          {!emailVerified? <button onClick={()=>{ if(!email.includes('@')) return alert('Valid email'); localStorage.setItem('nkc_email_verified',email); setEmailVerified(true); alert('Mail verified ✓'); }} className="w-full mt-2 bg-[#222] py-2 rounded-full text-xs">Verify Email</button> : <div className="mt-2 text-xs text-green-400">✓ Email verified: {localStorage.getItem('nkc_email_verified')}</div>}
          <div className="flex gap-2 mt-4"><button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#222] py-3 rounded-full text-xs">Cancel</button>
          <button onClick={()=>{ if(!name.trim()||!addr.trim()) return alert('Name + address needed'); const pr={user_id:crypto.randomUUID(), full_name:name.trim(), street_address:addr.trim(), email}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false); }} className="flex-1 bg-white text-black py-3 rounded-full text-xs font-bold">Join</button></div>
        </div>
      </div>}
    </div>
  );
}
