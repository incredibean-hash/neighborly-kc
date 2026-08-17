'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase, displayName } from '../../lib/community';
import { useAppTheme } from '../../lib/use-theme';

export default function PeoplePage(){
  const theme = useAppTheme();
  const [profiles,setProfiles]=useState<any[]>([]);
  const [search,setSearch]=useState('');
  const [me,setMe]=useState<any>(null);
  const [connections,setConnections]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [errorMessage,setErrorMessage]=useState('');

  const load=async()=>{
    setLoading(true);
    const {data:{session}}=await supabase.auth.getSession();const user=session?.user||null; setMe(user);
    const {data:p,error:profileError}=await supabase.from('profiles').select('auth_user_id,full_name,email,zip,street_address,avatar_url,is_founder,is_admin,is_verified,neighborhood_id').not('auth_user_id','is',null).order('full_name');
    if(profileError) setErrorMessage('Neighbors could not be loaded: '+profileError.message); else if(p) setProfiles(p);
    if(user){ const {data:c,error:connectionError}=await supabase.from('connections').select('*').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`); if(connectionError) setErrorMessage('Connections could not be loaded: '+connectionError.message); else if(c) setConnections(c); }
    setLoading(false);
  };
  useEffect(()=>{load()},[]);
  const statusFor=(id:string)=>{const c=connections.find(x=>x.requester_id===id||x.addressee_id===id); if(!c)return null; if(c.status==='accepted')return 'connected'; if(c.requester_id===me?.id)return 'pending'; return 'incoming';};
  const connect=async(id:string)=>{
    if(!me)return window.location.href='/';
    setBusy(id);
    const {error}=await supabase.from('connections').insert({requester_id:me.id,addressee_id:id,status:'pending'});
    if(error && !error.message.toLowerCase().includes('duplicate')) {
      alert(error.message.includes('requester_id') || error.message.includes('addressee_id') ? 'Connections need the latest Neighborly KC database fix. Run supabase_batch_fixes.sql in Supabase SQL Editor.' : error.message);
    }
    await load(); setBusy(null);
  };
  const filtered=useMemo(()=>profiles.filter(p=>p.auth_user_id!==me?.id && displayName(p).toLowerCase().includes(search.toLowerCase())),[profiles,search,me]);
  const border={borderColor:theme.border};
  return <main className="min-h-screen" style={{backgroundColor:theme.bg,color:theme.text}}>
    <header className="sticky top-0 z-20 p-4 shadow-sm" style={{backgroundColor:theme.header,color:'#fff'}}>
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        <div className="min-w-0"><Link href="/" className="text-xs opacity-70">← Back to Feed</Link><h1 className="font-black text-2xl">People across KC</h1><p className="text-xs opacity-70">Find neighbors. Connect. Talk.</p></div>
        <Link href="/connections" className="shrink-0 rounded-full px-4 py-2 text-sm font-bold" style={{backgroundColor:theme.card,color:theme.accent,border:`1px solid ${theme.border}`}}>Connections</Link>
      </div>
    </header>
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search neighbors..." className="w-full rounded-2xl px-5 py-4 outline-none" style={{backgroundColor:theme.card,color:theme.text,...border}} />
      {errorMessage&&<div className="rounded-2xl p-4 border font-bold text-sm" style={{backgroundColor:theme.input,...border}}>{errorMessage}<div className="text-xs font-normal opacity-60 mt-1">Run the latest supabase_batch_fixes.sql in Supabase if this is a database policy error.</div></div>}{loading?<div className="text-center py-16 opacity-50">Loading neighbors…</div>:!filtered.length?<div className="rounded-2xl p-10 text-center" style={{backgroundColor:theme.card,...border}}><p className="opacity-60 mb-4">No neighbors found yet.</p><Link href="/" className="inline-flex rounded-full px-5 py-2.5 font-bold" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>← Back to Feed</Link></div>:filtered.map(p=>{const st=statusFor(p.auth_user_id);return <div key={p.auth_user_id} className="rounded-2xl p-4 flex items-center gap-4" style={{backgroundColor:theme.card,...border}}><div className="w-12 h-12 rounded-full grid place-items-center font-black text-lg" style={{backgroundColor:theme.input}}>{displayName(p).slice(0,1).toUpperCase()}</div><div className="flex-1 min-w-0"><Link href={`/profile/${p.auth_user_id}`} className="font-black hover:underline">{displayName(p)}</Link><p className="text-sm opacity-60">📍 Kansas City{p.zip?` • ${p.zip}`:''}</p></div><div className="flex gap-2 flex-wrap justify-end w-full sm:w-auto">{st==='connected'?<Link href={`/profile/${p.auth_user_id}`} className="rounded-full border px-3 sm:px-4 py-2 text-sm font-bold shrink-0" style={border}>Connected</Link>:st==='pending'?<span className="rounded-full px-4 py-2 text-sm font-bold opacity-60" style={{backgroundColor:theme.input}}>Pending</span>:st==='incoming'?<Link href="/connections" className="rounded-full px-3 sm:px-4 py-2 text-sm font-bold shrink-0" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>Respond</Link>:<button disabled={busy===p.auth_user_id} onClick={()=>connect(p.auth_user_id)} className="rounded-full px-3 sm:px-4 py-2 text-sm font-bold shrink-0" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{busy===p.auth_user_id?'...':'Connect'}</button>}<Link href={`/dms?user=${p.auth_user_id}`} className="rounded-full border px-3 sm:px-4 py-2 text-sm font-bold shrink-0" style={border}>Message</Link></div></div>})}
    </div>
  </main>;
}
