'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, displayName } from '../../lib/community';
import { useAppTheme } from '../../lib/use-theme';

export default function ConnectionsPage(){
 const theme=useAppTheme();
 const [me,setMe]=useState<any>(null),[items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);const {data:{user}}=await supabase.auth.getUser();setMe(user);if(!user){setLoading(false);return;}const {data}=await supabase.from('connections').select('id,requester_id,addressee_id,status,created_at').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).order('created_at',{ascending:false});if(!data){setLoading(false);return;}const ids=[...new Set(data.flatMap(c=>[c.requester_id,c.addressee_id]).filter(x=>x!==user.id))];const {data:p}=await supabase.from('profiles').select('auth_user_id,full_name,email,zip').in('auth_user_id',ids);const map=new Map((p||[]).map(x=>[x.auth_user_id,x]));setItems(data.map(c=>({...c,person:map.get(c.requester_id===user.id?c.addressee_id:c.requester_id)})));setLoading(false)};
 useEffect(()=>{load()},[]);
 const accept=async(id:string)=>{if(!me)return;const {error}=await supabase.from('connections').update({status:'accepted'}).eq('id',id).eq('addressee_id',me.id);if(error)alert(error.message);await load()};
 const remove=async(id:string)=>{const {error}=await supabase.from('connections').delete().eq('id',id);if(error)alert(error.message);await load()};
 return <main className="min-h-screen" style={{backgroundColor:theme.bg,color:theme.text}}>
  <header className="p-4" style={{backgroundColor:theme.header,color:theme.headerText}}><div className="max-w-3xl mx-auto"><Link href="/people" className="text-xs opacity-70">← People</Link><h1 className="font-black text-2xl">Connections</h1><p className="text-xs opacity-70">Your Neighborly KC network</p></div></header>
  <div className="max-w-3xl mx-auto p-4 space-y-3">{loading?<div className="text-center py-16 opacity-50">Loading…</div>:!items.length?<div className="rounded-2xl p-10 text-center opacity-60" style={{backgroundColor:theme.card,border:`1px solid ${theme.border}`}}>No connections yet. Find neighbors to get started.</div>:items.map(c=><div key={c.id} className="rounded-2xl p-4 flex items-center gap-4" style={{backgroundColor:theme.card,border:`1px solid ${theme.border}`}}><div className="w-11 h-11 rounded-full grid place-items-center font-black" style={{backgroundColor:theme.input}}>{displayName(c.person).slice(0,1).toUpperCase()}</div><div className="flex-1 min-w-0"><Link className="font-black hover:underline" href={`/profile/${c.person?.auth_user_id}`}>{displayName(c.person)}</Link><p className="text-xs opacity-60">📍 Kansas City {c.person?.zip?`• ${c.person.zip}`:''}</p></div>{c.status==='pending'&&c.addressee_id===me?.id?<><button onClick={()=>accept(c.id)} className="rounded-full px-4 py-2 text-sm font-bold" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>Accept</button><button onClick={()=>remove(c.id)} className="rounded-full border px-4 py-2 text-sm font-bold" style={{borderColor:theme.border}}>Decline</button></>:c.status==='pending'?<span className="text-sm font-bold opacity-50">Pending</span>:<><span className="text-sm font-bold">Connected</span><button onClick={()=>remove(c.id)} className="rounded-full border px-3 py-2 text-xs font-bold" style={{borderColor:theme.border}}>Remove</button></>}</div>)}</div>
 </main>
}
