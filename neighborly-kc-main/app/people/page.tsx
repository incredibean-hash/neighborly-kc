'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function PeoplePage(){
  const router=useRouter();
  const [me,setMe]=useState<any>(null);
  const [people,setPeople]=useState<any[]>([]);
  const [q,setQ]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setLoading(false);return;}
    setMe(user);
    const {data}=await supabase.from('profiles').select('*').neq('auth_user_id',user.id).order('full_name');
    setPeople(data||[]);
    setLoading(false);
  })()},[]);

  const filtered=useMemo(()=>people.filter(p=>`${p.full_name} ${p.zip}`.toLowerCase().includes(q.toLowerCase())),[people,q]);

  if(loading)return <main className="min-h-screen bg-[#070a0f] text-white grid place-items-center">Loading neighbors…</main>;
  if(!me)return <main className="min-h-screen bg-[#070a0f] text-white p-8 text-center"><h1 className="text-3xl font-black">Meet your KC neighbors</h1><button onClick={()=>router.push('/')} className="mt-5 bg-white text-black px-6 py-3 rounded-full font-bold">Sign in</button></main>;

  return <main className="min-h-screen bg-[#070a0f] text-white">
    <header className="sticky top-0 z-20 bg-[#0a0d14]/95 backdrop-blur border-b border-white/10"><div className="max-w-4xl mx-auto p-4 flex items-center gap-3"><button onClick={()=>router.push('/')} className="w-10 h-10 rounded-full bg-white/10">←</button><div><h1 className="font-black text-xl">People in KC</h1><p className="text-xs text-white/50">Talk to anyone in the 40-mile Neighborly network</p></div></div></header>
    <div className="max-w-4xl mx-auto p-4">
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search neighbors by name or ZIP…" className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 outline-none"/>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {filtered.map(p=><div key={p.auth_user_id} className="rounded-2xl border border-white/10 bg-white/[.04] p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white text-black grid place-items-center font-black">{p.full_name?.split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()}</div>
          <div className="flex-1 min-w-0"><b className="block truncate">{p.full_name}</b><p className="text-xs text-white/50">{p.zip||'Kansas City'} · Neighborly KC</p></div>
          <button onClick={()=>router.push(`/dms?to=${p.auth_user_id}`)} className="px-3 py-2 rounded-full bg-[#1976ff] text-xs font-black">Message</button>
        </div>)}
      </div>
    </div>
  </main>;
}
