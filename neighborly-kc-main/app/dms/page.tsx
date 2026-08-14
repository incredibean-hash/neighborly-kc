'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Profile = {
  id?: string;
  auth_user_id: string;
  full_name: string;
  email?: string;
  zip?: string;
};

type DM = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message?: string;
  body?: string;
  created_at: string;
};

function avatar(name:string){
  return (name || 'N').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
}

export default function DMsPage(){
  const router=useRouter();
  const [me,setMe]=useState<Profile|null>(null);
  const [people,setPeople]=useState<Profile[]>([]);
  const [messages,setMessages]=useState<DM[]>([]);
  const [selected,setSelected]=useState<Profile|null>(null);
  const [text,setText]=useState('');
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [pendingTo,setPendingTo]=useState<string|null>(null);
  const bottomRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    setPendingTo(typeof window!=='undefined' ? new URLSearchParams(window.location.search).get('to') : null);
    let channel:any;
    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){ setLoading(false); return; }
      const {data:profile}=await supabase.from('profiles').select('*').eq('auth_user_id',user.id).maybeSingle();
      if(!profile){ setLoading(false); return; }
      setMe(profile);
      const {data:all}=await supabase.from('profiles').select('*').neq('auth_user_id',user.id).order('full_name');
      setPeople(all||[]);
      const target = (all||[]).find((p:any)=>p.auth_user_id===new URLSearchParams(window.location.search).get('to'));
      if(target) loadConversation(target);
      channel=supabase.channel(`dm-inbox-${user.id}`)
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'dms',filter:`to_user_id=eq.${user.id}`},(payload)=>{
          setMessages(prev=>[...prev,payload.new as DM]);
        }).subscribe();
      setLoading(false);
    })();
    return()=>{ if(channel) supabase.removeChannel(channel); };
  },[]);

  const loadConversation=async(person:Profile)=>{
    if(!me) return;
    setSelected(person);
    const {data}=await supabase.from('dms').select('*')
      .or(`and(from_user_id.eq.${me.auth_user_id},to_user_id.eq.${person.auth_user_id}),and(from_user_id.eq.${person.auth_user_id},to_user_id.eq.${me.auth_user_id})`)
      .order('created_at',{ascending:true});
    setMessages(data||[]);
  };

  const send=async()=>{
    if(!me||!selected||!text.trim()) return;
    const body=text.trim();
    const {data,error}=await supabase.from('dms').insert({
      from_user_id:me.auth_user_id,
      to_user_id:selected.auth_user_id,
      from_user:me.full_name,
      to_user:selected.full_name,
      message:body,
      body
    }).select().single();
    if(error){ alert(error.message); return; }
    if(data) setMessages(prev=>[...prev,data]);
    setText('');
  };

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[messages,selected]);

  const filtered=useMemo(()=>people.filter(p=>p.full_name?.toLowerCase().includes(search.toLowerCase())),[people,search]);

  if(loading) return <main className="min-h-screen bg-[#0a0d14] text-white grid place-items-center">Loading Neighborly KC…</main>;

  if(!me) return (
    <main className="min-h-screen bg-[#0a0d14] text-white p-6">
      <div className="max-w-md mx-auto pt-16 text-center">
        <div className="text-5xl mb-4">💬</div>
        <h1 className="text-3xl font-black">Neighborly DMs</h1>
        <p className="text-white/60 mt-2">Sign in to message people across Kansas City.</p>
        <button onClick={()=>router.push('/')} className="mt-6 bg-white text-black px-6 py-3 rounded-full font-black">Back to Neighborly KC</button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#0a0d14] text-white">
      <header className="sticky top-0 z-20 bg-[#0a0d14]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={()=>router.push('/')} className="w-10 h-10 rounded-full bg-white/10">←</button>
          <div><h1 className="font-black text-xl">Messages</h1><p className="text-xs text-white/50">Neighbors across the KC 40-mile network</p></div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid md:grid-cols-[320px_1fr] min-h-[calc(100vh-73px)]">
        <aside className="border-r border-white/10 p-4">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search neighbors…" className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 outline-none" />
          <p className="text-xs uppercase tracking-wider text-white/40 font-bold mt-5 mb-2">People</p>
          <div className="space-y-1">
            {filtered.map(p=><button key={p.auth_user_id} onClick={()=>loadConversation(p)} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 ${selected?.auth_user_id===p.auth_user_id?'bg-[#1976ff]':'hover:bg-white/10'}`}>
              <span className="w-10 h-10 rounded-full bg-white text-black grid place-items-center font-black text-xs">{avatar(p.full_name)}</span>
              <span className="min-w-0"><b className="block truncate">{p.full_name}</b><small className="text-white/50">{p.zip||'Kansas City'}</small></span>
            </button>)}
            {!filtered.length&&<p className="text-sm text-white/40 p-3">No neighbors found.</p>}
          </div>
        </aside>

        <section className="flex flex-col min-h-[calc(100vh-73px)]">
          {!selected ? (
            <div className="flex-1 grid place-items-center p-8 text-center">
              <div><div className="text-6xl mb-4">🏙️</div><h2 className="text-2xl font-black">Talk to anyone in KC</h2><p className="text-white/50 max-w-sm mt-2">Pick a neighbor to start a private conversation. Your neighborhood doesn't have to limit who you can meet.</p></div>
            </div>
          ):(
            <>
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-white text-black grid place-items-center font-black text-xs">{avatar(selected.full_name)}</span>
                <div><b>{selected.full_name}</b><p className="text-xs text-white/50">Neighborly KC · {selected.zip||'KC'}</p></div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.filter(m=>(m.from_user_id===me.auth_user_id&&m.to_user_id===selected.auth_user_id)||(m.from_user_id===selected.auth_user_id&&m.to_user_id===me.auth_user_id)).map(m=>{
                  const mine=m.from_user_id===me.auth_user_id;
                  return <div key={m.id} className={`flex ${mine?'justify-end':'justify-start'}`}><div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${mine?'bg-[#1976ff] rounded-br-md':'bg-white/10 rounded-bl-md'}`}><p className="whitespace-pre-wrap">{m.message||m.body}</p><small className="block text-[10px] opacity-50 mt-1">{new Date(m.created_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</small></div></div>
                })}
                <div ref={bottomRef}/>
              </div>
              <div className="p-4 border-t border-white/10 flex gap-2">
                <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder={`Message ${selected.full_name.split(' ')[0]}…`} className="flex-1 rounded-full bg-white/10 border border-white/10 px-5 py-3 outline-none" />
                <button onClick={send} className="bg-[#1976ff] px-5 rounded-full font-black">Send</button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
