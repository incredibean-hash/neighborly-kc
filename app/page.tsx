'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
function getSupabase(){
  if(typeof window==='undefined') return null;
  const u=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!u||!k) return null;
  return createClient(u,k);
}
function formatCST(iso:string){
  try{ return new Date(iso).toLocaleString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' CST'; }
  catch{ return ''; }
}
export default function Page(){
  const [supabase,setSupabase]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState(''); const [addr,setAddr]=useState(''); const [body,setBody]=useState('');
  useEffect(()=>{
    const sb=getSupabase(); setSupabase(sb);
    const raw=localStorage.getItem('nkc_profile');
    if(raw){ try{ setProfile(JSON.parse(raw)); }catch{} }
    (async()=>{ if(!sb) return; const {data}=await sb.from('posts').select('*').order('created_at',{ascending:false}).limit(50); if(data) setPosts(data); })();
  },[]);
  return(
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      <header className="bg-[#111] border-b border-[#222] p-4 flex justify-between sticky top-0"><div className="flex gap-2 items-center"><img src="/icon-192.png" className="w-8 h-8 rounded bg-white" /><span className="font-black">Neighborly KC</span></div>
        {!profile? <button onClick={()=>setShowJoin(true)} className="bg-white text-black px-4 py-1 rounded-full text-xs font-bold">Join</button> : <button onClick={()=>{localStorage.clear(); location.reload();}} className="bg-[#222] px-3 py-1 rounded-full text-xs">Log out</button>}
      </header>
      <div className="max-w-[600px] mx-auto p-4 space-y-3">
        <div className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-4">
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="What's up?" className="w-full bg-black border border-[#333] rounded-xl p-3 text-sm min-h-[60px]" />
          <button onClick={async()=>{ if(!profile){ setShowJoin(true); return; } if(!body.trim()) return; const {data,error}=await supabase.from('posts').insert({body, author_name:profile.full_name}).select().single(); if(error) alert(error.message); else { setPosts([data,...posts]); setBody(''); } }} className="mt-2 bg-white text-black px-4 py-2 rounded-full text-xs font-bold">Post</button>
        </div>
        {posts.map((p:any)=><div key={p.id} className="bg-[#1a1a1a] border border-[#222] rounded-2xl p-4"><div className="flex justify-between"><span className="text-xs font-bold">{p.author_name}</span><span className="text-[10px] opacity-40">{formatCST(p.created_at)}</span></div><p className="mt-2 text-sm">{p.body}</p><button onClick={async()=>{ if(!confirm('Delete?')) return; await supabase.from('posts').delete().eq('id',p.id); setPosts(posts.filter(x=>x.id!==p.id)); }} className="mt-2 text-[10px] bg-[#222] px-2 py-1 rounded-full">Delete</button></div>)}
      </div>
      {showJoin&&<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 w-full max-w-sm"><h2 className="font-black">Join</h2><input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-black border border-[#333] rounded-xl px-3 py-3 mt-4 text-sm" /><input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Address" className="w-full bg-black border border-[#333] rounded-xl px-3 py-3 mt-2 text-sm" /><div className="flex gap-2 mt-4"><button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#222] py-3 rounded-full text-xs">Cancel</button><button onClick={()=>{ if(!name.trim()) return alert('Name required'); const pr={user_id:crypto.randomUUID(), full_name:name.trim(), street_address:addr.trim()}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false); }} className="flex-1 bg-white text-black py-3 rounded-full text-xs font-bold">Join</button></div></div></div>}
    </div>
  );
}
