'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase, displayName } from '../../lib/community';

export default function PeoplePage(){
  const [profiles,setProfiles]=useState<any[]>([]);
  const [search,setSearch]=useState('');
  const [me,setMe]=useState<any>(null);
  const [connections,setConnections]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);

  const load=async()=>{
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser(); setMe(user);
    const {data:p}=await supabase.from('profiles').select('auth_user_id,full_name,email,zip,street_address').not('auth_user_id','is',null).order('full_name');
    if(p) setProfiles(p);
    if(user){ const {data:c}=await supabase.from('connections').select('*').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`); if(c) setConnections(c); }
    setLoading(false);
  };
  useEffect(()=>{load()},[]);
  const statusFor=(id:string)=>{const c=connections.find(x=>x.requester_id===id||x.addressee_id===id); if(!c)return null; if(c.status==='accepted')return 'connected'; if(c.requester_id===me?.id)return 'pending'; return 'incoming';};
  const connect=async(id:string)=>{ if(!me)return window.location.href='/'; setBusy(id); const {error}=await supabase.from('connections').insert({requester_id:me.id,addressee_id:id,status:'pending'}); if(error && !error.message.toLowerCase().includes('duplicate')) alert(error.message); await load(); setBusy(null); };
  const filtered=useMemo(()=>profiles.filter(p=>p.auth_user_id!==me?.id && displayName(p).toLowerCase().includes(search.toLowerCase())),[profiles,search,me]);
  return <main className="min-h-screen bg-[#f2eadc] text-[#1a3a2f]">
    <header className="sticky top-0 z-20 bg-[#1a3a2f] text-white p-4 shadow-sm"><div className="max-w-3xl mx-auto flex items-center justify-between"><div><Link href="/" className="text-xs opacity-70">← Back to Feed</Link><h1 className="font-black text-2xl">People across KC</h1><p className="text-xs opacity-70">Find neighbors. Connect. Talk.</p></div><Link href="/connections" className="rounded-full bg-white text-[#1a3a2f] px-4 py-2 text-sm font-bold">Connections</Link></div></header>
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search neighbors..." className="w-full rounded-2xl border border-[#e5d9c5] bg-white px-5 py-4 outline-none" />
      {loading?<div className="text-center py-16 opacity-50">Loading neighbors…</div>:!filtered.length?<div className="rounded-2xl bg-white p-10 text-center opacity-60">No neighbors found yet.</div>:filtered.map(p=>{const st=statusFor(p.auth_user_id);return <div key={p.auth_user_id} className="rounded-2xl border border-[#e5d9c5] bg-white p-4 flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-[#e8e0d0] grid place-items-center font-black text-lg">{displayName(p).slice(0,1).toUpperCase()}</div><div className="flex-1 min-w-0"><Link href={`/profile/${p.auth_user_id}`} className="font-black hover:underline">{displayName(p)}</Link><p className="text-sm opacity-60">📍 Kansas City{p.zip?` • ${p.zip}`:''}</p></div><div className="flex gap-2">{st==='connected'?<Link href={`/profile/${p.auth_user_id}`} className="rounded-full border px-4 py-2 text-sm font-bold">Connected</Link>:st==='pending'?<span className="rounded-full bg-[#f1ede6] px-4 py-2 text-sm font-bold opacity-60">Pending</span>:st==='incoming'?<Link href="/connections" className="rounded-full bg-[#1a3a2f] text-white px-4 py-2 text-sm font-bold">Respond</Link>:<button disabled={busy===p.auth_user_id} onClick={()=>connect(p.auth_user_id)} className="rounded-full bg-[#1a3a2f] text-white px-4 py-2 text-sm font-bold">{busy===p.auth_user_id?'...':'Connect'}</button>}<Link href={`/dms?user=${p.auth_user_id}`} className="rounded-full border px-4 py-2 text-sm font-bold">Message</Link></div></div>})}
    </div>
  </main>;
}
