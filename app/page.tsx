"use client";
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);



const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];

export default function Page(){
  const [hoods,setHoods]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [hood,setHood]=useState('parkwood-hills');
  const [cat,setCat]=useState('All');
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [addr,setAddr]=useState('');

  useEffect(()=>{ (async()=>{
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false});
    if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(50);
    if(p) setPosts(p);
    const s=typeof window!=='undefined' ? localStorage.getItem('nkc_profile') : null; 
    if(s) setProfile(JSON.parse(s));
  })() },[]);

  const cur = hoods.find((x:any)=>x.slug===hood) || hoods[0];
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#1a3a2f]">
      <header className="sticky top-0 bg-white border-b z-40"><div className="max-w-[1280px] mx-auto px-6 h-[64px] flex items-center justify-between">
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-[#1a3a2f] text-white rounded-lg flex items-center justify-center font-black">N</div><b>Neighborly KC</b><span className="ml-3 text-[10px] bg-green-100 border px-2 py-1 rounded-full font-bold">● LIVE {cur?.name} {cur?.zip}</span></div>
        <div className="flex gap-2"><select value={hood} onChange={e=>setHood(e.target.value)} className="bg-[#f8f5ee] border rounded-full px-4 py-2 text-sm font-bold">{hoods.map((h:any)=><option key={h.slug} value={h.slug}>{h.name} {h.zip}</option>)}</select>{profile?<span className="bg-[#1a3a2f] text-white px-4 py-2 rounded-full text-sm">Hi, {profile.full_name.split(' ')[0]} ✓</span>:<button onClick={()=>setShowJoin(true)} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full text-sm font-bold">Join {cur?.name}</button>}</div>
      </div></header>

      <div className="max-w-[1280px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-6">
        <aside className="bg-white rounded-2xl p-3 h-fit border hidden lg:block"><p className="text-[10px] font-bold opacity-40 px-3 py-2">FILTER</p>{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${cat===c?'bg-[#1a3a2f] text-white':'hover:bg-black/5'}`}>{c}</button>)}</aside>

        <main className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border"><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur?.name}?`:'Join Parkwood Hills to post...'} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[80px] text-sm outline-none" /><div className="flex justify-end mt-2"><button onClick={async()=>{ if(!profile) return setShowJoin(true); if(!body.trim()) return; await supabase.from('posts').insert({body, category:'General', neighborhood_id:cur?.id}); setPosts([{id:Math.random()+'',body,category:'General',created_at:new Date().toISOString(),profiles:{full_name:profile.full_name}},...posts]); setBody(''); }} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full text-sm font-bold">Post to neighbors</button></div></div>
          {filtered.length===0? <div className="bg-white rounded-2xl p-12 text-center border-dashed border"><div className="text-4xl">🏡</div><b>Be first in {cur?.name}!</b><p className="text-sm opacity-60">{cur?.member_count} neighbors watching {cur?.zip}</p></div> : filtered.map((p:any)=><div key={p.id} className="bg-white rounded-2xl p-4 border"><p className="text-xs font-bold opacity-60">{p.profiles?.full_name||'Neighbor'} · {p.category}</p><p className="mt-1">{p.body}</p><p className="text-[10px] opacity-40 mt-2">{new Date(p.created_at).toLocaleString()}</p></div>)}
        </main>

        <aside className="bg-white rounded-2xl p-5 border h-fit"><h3 className="font-black">{cur?.name}</h3><p className="text-xs opacity-60">{cur?.zip} · Kansas City, MO</p><div className="grid grid-cols-2 gap-2 mt-4"><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{cur?.member_count}</b><p className="text-[10px]">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{posts.length}</b><p className="text-[10px]">POSTS</p></div></div></aside>
      </div>

      {showJoin && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-[20px] w-full max-w-[400px] p-6"><h2 className="font-black text-xl">Join {cur?.name}</h2><form onSubmit={e=>{e.preventDefault(); const pr={full_name:name,email,street_address:addr,zip:cur.zip,neighborhood_id:cur.id}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false);}} className="mt-4 space-y-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><input required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><input required value={addr} onChange={e=>setAddr(e.target.value)} placeholder={`Address in ${cur?.zip}`} className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><div className="flex gap-2 pt-2"><button type="button" onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button><button className="flex-1 bg-[#1a3a2f] text-white py-3 rounded-full font-bold text-sm">Join</button></div></form></div></div>}
    </div>
  );
}
