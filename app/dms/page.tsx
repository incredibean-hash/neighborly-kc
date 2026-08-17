'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, displayName } from '../../lib/community';
import { useAppTheme } from '../../lib/use-theme';

function DmsContent(){
 const theme=useAppTheme();
 const params=useSearchParams(); const target=params.get('user');
 const [me,setMe]=useState<any>(null),[people,setPeople]=useState<any[]>([]),[messages,setMessages]=useState<any[]>([]),[selected,setSelected]=useState<string|null>(target),[text,setText]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[errorText,setErrorText]=useState('');
 const load=async()=>{setLoading(true);setErrorText('');const {data:{user}}=await supabase.auth.getUser();setMe(user);if(!user){setLoading(false);return;}const {data:p,error}=await supabase.from('profiles').select('auth_user_id,full_name,email,zip').not('auth_user_id','is',null).neq('auth_user_id',user.id).order('full_name');if(error){setErrorText(error.message);setPeople([])}else setPeople(p||[]);setLoading(false)};
 const loadMessages=async(id:string)=>{if(!me)return;setSelected(id);setErrorText('');const {data,error}=await supabase.from('dms').select('*').or(`and(from_user_id.eq.${me.id},to_user_id.eq.${id}),and(from_user_id.eq.${id},to_user_id.eq.${me.id})`).order('created_at',{ascending:true});if(error){setErrorText(error.message.includes('from_user_id')||error.message.includes('to_user_id')?'Messages need the latest Neighborly KC database fix. Run supabase_batch_fixes.sql in Supabase SQL Editor.':error.message);setMessages([]);return;}setMessages(data||[])};
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(me&&target)loadMessages(target)},[me,target]);
 useEffect(()=>{if(!me)return;const ch=supabase.channel('nkc-dms').on('postgres_changes',{event:'INSERT',schema:'public',table:'dms'},payload=>{const m:any=payload.new;if((m.from_user_id===me.id&&m.to_user_id===selected)||(m.to_user_id===me.id&&m.from_user_id===selected))setMessages(x=>x.some(y=>y.id===m.id)?x:[...x,m])}).subscribe();return()=>{supabase.removeChannel(ch)}},[me,selected]);
 const current=useMemo(()=>people.find(p=>p.auth_user_id===selected),[people,selected]);
 const send=async()=>{if(!me||!selected||!text.trim())return;setSending(true);const message=text.trim();const {data,error}=await supabase.from('dms').insert({from_user_id:me.id,to_user_id:selected,message,body:message}).select().single();if(error)alert(error.message);else{setMessages(x=>x.some(y=>y.id===data.id)?x:[...x,data]);setText('')}setSending(false)};
 if(loading)return <main className="min-h-screen grid place-items-center" style={{backgroundColor:theme.bg,color:theme.text}}>Loading…</main>;
 if(!me)return <main className="min-h-screen grid place-items-center" style={{backgroundColor:theme.bg,color:theme.text}}><div className="text-center"><p className="font-bold">Sign in to use Messages.</p><Link href="/" className="underline">Back to Neighborly KC</Link></div></main>;
 const border={borderColor:theme.border};
 return <main className="min-h-screen" style={{backgroundColor:theme.bg,color:theme.text}}>
  <header className="p-4" style={{backgroundColor:theme.header,color:'#fff'}}><div className="max-w-4xl mx-auto flex justify-between items-center gap-3"><div><Link href="/" className="text-xs opacity-70">← Feed</Link><h1 className="font-black text-2xl">Messages</h1></div><Link href="/people" className="shrink-0 rounded-full px-4 py-2 text-sm font-bold" style={{backgroundColor:theme.card,color:theme.accent,border:`1px solid ${theme.border}`}}>Find People</Link></div></header>
  <div className="max-w-4xl mx-auto p-4 grid md:grid-cols-[280px_1fr] gap-4">
   <aside className={`rounded-2xl p-3 ${selected?'hidden md:block':''}`} style={{backgroundColor:theme.card,...border}}><p className="text-xs font-bold opacity-50 px-2 pb-2">NEIGHBORS</p>{!people.length?<p className="p-3 text-sm opacity-50">No other members yet.</p>:people.map(p=><button key={p.auth_user_id} onClick={()=>loadMessages(p.auth_user_id)} className="w-full text-left rounded-xl p-3" style={selected===p.auth_user_id?{backgroundColor:theme.accent,color:theme.pillTextActive}:{}}><b className="block text-sm">{displayName(p)}</b><span className="text-xs opacity-60">Kansas City{p.zip?` • ${p.zip}`:''}</span></button>)}</aside>
   <section className={`rounded-2xl min-h-[520px] flex flex-col ${selected?'':'hidden md:flex'}`} style={{backgroundColor:theme.card,...border}}>
    {selected?<><div className="p-4 border-b flex items-center gap-3" style={border}><button className="md:hidden text-sm font-bold" onClick={()=>setSelected(null)}>←</button><Link href={`/profile/${selected}`} className="font-black hover:underline">{displayName(current)}</Link><p className="text-xs opacity-50">Private conversation</p></div><div className="flex-1 p-4 space-y-2 overflow-y-auto">{errorText&&<div className="rounded-xl p-3 text-sm" style={{backgroundColor:theme.input,color:theme.text}}>{errorText}</div>}{messages.map(m=><div key={m.id} className={`flex ${m.from_user_id===me.id?'justify-end':''}`}><div className="max-w-[75%] rounded-2xl px-4 py-2" style={{backgroundColor:m.from_user_id===me.id?theme.accent:theme.input,color:m.from_user_id===me.id?theme.pillTextActive:theme.text}}><p>{m.message||m.body}</p><p className="text-[10px] opacity-50 mt-1">{new Date(m.created_at).toLocaleString()}</p></div></div>)}{!messages.length&&<p className="text-center opacity-40 py-16">Start the conversation.</p>}</div><div className="p-3 border-t flex gap-2" style={border}><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send()}} placeholder={`Message ${displayName(current)}...`} className="flex-1 rounded-full px-4 py-3 outline-none" style={{backgroundColor:theme.input,color:theme.text,border:`1px solid ${theme.border}`}}/><button disabled={sending} onClick={send} className="rounded-full px-5 font-bold" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{sending?'...':'Send'}</button></div></>:<div className="flex-1 grid place-items-center p-10 text-center opacity-50">Select a neighbor to start a conversation.</div>}
   </section>
  </div>
 </main>;
}

export default function DmsPage(){
  return <Suspense fallback={<main className="min-h-screen grid place-items-center bg-[#f0f6ff] text-[#00205a]">Loading…</main>}><DmsContent /></Suspense>;
}
