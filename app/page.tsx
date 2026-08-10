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

const CATS=['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];

export default function Page(){
  const [supabase,setSupabase]=useState<any>(null);
  const [hoods,setHoods]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState('');
  const [mounted,setMounted]=useState(false);

  useEffect(()=>{
    setMounted(true);
    setSupabase(getSupabase());
    const s=localStorage.getItem('nkc_profile')||localStorage.getItem('nkc_profile_tiered_40');
    if(s){try{setProfile(JSON.parse(s))}catch{}}
  },[]);

  useEffect(()=>{(async()=>{
    if(!supabase) return;
    const {data:h}=await supabase.from('neighborhoods').select('*').limit(20);
    if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(50);
    if(p) setPosts(p);
  })()},[supabase]);

  const cur=hoods[0]||{name:'Parkwood Hills',zip:'64155',id:null,slug:'parkwood-hills',member_count:247};

  if(!mounted) return <div className="p-8">Loading...</div>;

  return(
    <div className="min-h-screen bg-[#f8f5ee]">
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <h1 className="font-black">Neighborly KC</h1>
        {profile? <span className="text-xs">{profile.full_name}</span> : <button onClick={()=>setShowJoin(true)} className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold">Join</button>}
      </header>
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?"What's up?":"Join to post..."} className="w-full bg-white border rounded-xl p-3 min-h-[80px]" />
        <button onClick={async()=>{
          if(!profile) return setShowJoin(true);
          if(!supabase) return alert('Add Supabase keys in Vercel Env Vars then Redeploy');
          if(!body.trim()) return;
          const {data,error}=await supabase.from('posts').insert({body,author_name:profile.full_name,category:'General',neighborhood_id:cur.id}).select().single();
          if(error) return alert(error.message);
          setPosts([data,...posts]); setBody('');
        }} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full font-bold">Post</button>
        {posts.map((p:any)=><div key={p.id} className="bg-white p-4 rounded-xl border"><p className="text-xs opacity-60">{p.author_name||'Neighbor'}</p><p className="mt-1">{p.body}</p></div>)}
      </div>
      {showJoin&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-2xl w-full max-w-sm"><h2 className="font-black text-xl">Join {cur.name}</h2><input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 mt-4"/><div className="flex gap-2 mt-4"><button onClick={()=>setShowJoin(false)} className="flex-1 bg-gray-100 py-3 rounded-full">Cancel</button><button onClick={()=>{if(!name.trim()) return alert('Enter name'); const pr={full_name:name.trim()}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false); location.reload();}} className="flex-1 bg-black text-white py-3 rounded-full">Join</button></div></div></div>}
    </div>
  );
}
