'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function formatRelativeLocal(iso:string){
  try{
    const d=new Date(iso);
    const now=new Date();
    const diffMs=now.getTime()-d.getTime();
    const diffSec=Math.floor(diffMs/1000);
    const diffMin=Math.floor(diffSec/60);
    const diffHr=Math.floor(diffMin/60);
    const diffDay=Math.floor(diffHr/24);
    let rel='';
    if(diffSec<60) rel='Just now';
    else if(diffMin<60) rel=`${diffMin}m ago`;
    else if(diffHr<24) rel=`${diffHr}h ago`;
    else if(diffDay<7) rel=`${diffDay}d ago`;
    else rel=d.toLocaleDateString();
    const localTime=d.toLocaleString(undefined,{ month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true });
    return `${rel} • ${localTime}`;
  }catch{ return new Date(iso).toLocaleString(); }
}

export default function DMsPage(){
  const [profile,setProfile]=useState<any>(null);
  const [dms,setDms]=useState<any[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [reply,setReply]=useState('');
  const [search,setSearch]=useState('');

  useEffect(()=>{
    const s=typeof window!=='undefined'? localStorage.getItem('nkc_profile_tiered_40') || localStorage.getItem('nkc_profile') : null;
    if(s){ try{ setProfile(JSON.parse(s)); }catch{} }
  },[]);

  const loadDMs = async ()=>{
    if(!profile?.full_name) return;
    const {data, error} = await supabase.from('dms').select('*').or(`from_user.eq.${profile.full_name},to_user.eq.${profile.full_name}`).order('created_at',{ascending:false}).limit(200);
    if(data) setDms(data);
  };

  useEffect(()=>{ if(profile) loadDMs(); const int=setInterval(loadDMs,3000); return()=>clearInterval(int); },[profile]);

  // Group by conversation partner
  const convos: Record<string, any[]> = {};
  dms.forEach((m:any)=>{
    const other = m.from_user===profile?.full_name ? m.to_user : m.from_user;
    if(!convos[other]) convos[other]=[];
    convos[other].push(m);
  });
  // Sort convos by latest message
  const sortedConvoKeys = Object.keys(convos).sort((a,b)=>{
    const latestA = convos[a][0]?.created_at || '';
    const latestB = convos[b][0]?.created_at || '';
    return new Date(latestB).getTime() - new Date(latestA).getTime();
  }).filter(k=> !search || k.toLowerCase().includes(search.toLowerCase()));

  const activeMessages = selected ? (convos[selected]||[]).slice().reverse() : [];

  const sendReply = async ()=>{
    if(!selected || !reply.trim() || !profile) return;
    const msg=reply.trim();
    setReply('');
    try{
      await supabase.from('dms').insert({ from_user:profile.full_name, to_user:selected, message:msg, body:msg } as any);
      try{ await fetch('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:selected,from:profile.full_name,message:msg})}); }catch{}
      loadDMs();
    }catch(e:any){ alert('Failed: '+e.message); }
  };

  if(!profile) return <div className="min-h-screen bg-[#f8f5ee] p-6"><Link href="/" className="text-sm font-bold">← Back to Feed</Link><p className="mt-6">Please join first.</p></div>;

  return (
    <div className="min-h-screen bg-[#f8f5ee] flex flex-col">
      <header className="bg-white border-b sticky top-0 z-20 px-4 py-3 flex justify-between items-center">
        <Link href="/" className="font-black">← Meadowbrook • DMs</Link>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60">{profile.full_name} {profile.is_founder && '👑'}</span>
          <span className="text-xs bg-black text-white px-2 py-1 rounded-full">{dms.length} msgs</span>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-[320px_1fr] gap-0 md:gap-4 p-0 md:p-4">
        {/* Conversations list */}
        <div className="bg-white md:rounded-2xl border-b md:border md:h-[calc(100vh-100px)] flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people..." className="w-full bg-[#f8f5ee] rounded-full px-4 py-2 text-sm outline-none" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {sortedConvoKeys.length===0 && <p className="p-6 text-sm opacity-50">No DMs yet. Tap DM on any post to start.</p>}
            {sortedConvoKeys.map(other=>{
              const msgs=convos[other];
              const last=msgs[0];
              const unread=msgs.filter((m:any)=>m.to_user===profile.full_name).length;
              return (
                <button key={other} onClick={()=>setSelected(other)} className={`w-full text-left p-4 border-b hover:bg-black/5 flex justify-between items-start ${selected===other?'bg-[#f8f5ee]':''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{other} {last?.from_user===other && unread>0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unread}</span>}</p>
                    <p className="text-xs opacity-60 truncate mt-1">{last.from_user===profile.full_name?'You: ':''}{last.message||last.body}</p>
                    <p className="text-[10px] opacity-40 mt-1">{formatRelativeLocal(last.created_at)}</p>
                  </div>
                  <span className="text-[10px] bg-black/5 px-2 py-1 rounded-full ml-2">{msgs.length}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white md:rounded-2xl border md:h-[calc(100vh-100px)] flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-12 text-center opacity-50">
              <div><p className="text-4xl mb-2">💬</p><p className="font-bold">Select a conversation</p><p className="text-xs mt-1">Your DMs are private and tied to your UID. Only you and the other person see them.</p></div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b flex justify-between items-center bg-[#f8f5ee] md:rounded-t-2xl">
                <div><p className="font-black">{selected}</p><p className="text-[11px] opacity-60">{convos[selected]?.length} messages • {formatRelativeLocal(convos[selected]?.[0]?.created_at||new Date().toISOString())}</p></div>
                <button onClick={()=>setSelected(null)} className="md:hidden bg-white border px-3 py-1 rounded-full text-xs">Back</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f5ee]">
                {activeMessages.map((m:any)=>{
                  const isMe=m.from_user===profile.full_name;
                  return (
                    <div key={m.id} className={`flex ${isMe?'justify-end':'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe?'bg-[#1a3a2f] text-white rounded-br-sm':'bg-white border rounded-bl-sm'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.message||m.body}</p>
                        <p className={`text-[10px] mt-1 ${isMe?'text-white/60':'opacity-40'}`}>{formatRelativeLocal(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t flex gap-2 bg-white md:rounded-b-2xl">
                <input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') sendReply(); }} placeholder={`Reply to ${selected}...`} className="flex-1 bg-[#f8f5ee] border rounded-full px-4 py-3 text-sm outline-none" />
                <button onClick={sendReply} className="bg-black text-white px-5 py-3 rounded-full text-sm font-black">Send 🔔</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex justify-around text-xs">
        <Link href="/" className="font-bold opacity-60">Feed</Link>
        <span className="font-black">DMs • {dms.length}</span>
        <Link href="/" className="font-bold opacity-60">Post</Link>
      </div>
    </div>
  );
}
