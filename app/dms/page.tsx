'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function DMsPage(){
  const router=useRouter();
  const containerRef=useRef<HTMLDivElement>(null);
  const [profile,setProfile]=useState<any>(null);
  const [dms,setDms]=useState<any[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [reply,setReply]=useState('');
  const [touchStart,setTouchStart]=useState(0);

  // SWIPE RIGHT: DMs -> Posts
  useEffect(()=>{
    const el=containerRef.current;
    if(!el) return;
    const onStart=(e:TouchEvent)=>setTouchStart(e.touches[0].clientX);
    const onEnd=(e:TouchEvent)=>{
      const diff=e.changedTouches[0].clientX - touchStart;
      if(diff>100) router.push('/'); // swipe right
    };
    el.addEventListener('touchstart', onStart);
    el.addEventListener('touchend', onEnd);
    return()=>{ el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); }
  },[touchStart]);

  useEffect(()=>{
    const s=localStorage.getItem('nkc_profile')||localStorage.getItem('nkc_profile_tiered_40');
    if(s){ try{ setProfile(JSON.parse(s)); }catch{} }
  },[]);

  const loadDMs = async ()=>{
    if(!profile?.full_name) return;
    const {data}=await supabase.from('dms').select('*').or(`from_user.eq.${profile.full_name},to_user.eq.${profile.full_name}`).order('created_at',{ascending:false}).limit(200);
    if(data) setDms(data);
  };
  useEffect(()=>{ if(profile) loadDMs(); const i=setInterval(loadDMs,3000); return()=>clearInterval(i); },[profile]);

  const convos: Record<string, any[]> = {};
  dms.forEach((m:any)=>{
    const other = m.from_user===profile?.full_name? m.to_user : m.from_user;
    if(!convos[other]) convos[other]=[];
    convos[other].push(m);
  });
  const sortedKeys = Object.keys(convos).sort((a,b)=> new Date(convos[b][0]?.created_at).getTime() - new Date(convos[a][0]?.created_at).getTime());
  const activeMessages = selected? (convos[selected]||[]).slice().reverse() : [];

  if(!profile) return <div className="min-h-screen bg-[#0a0a0a] text-white p-6"><Link href="/" className="text-sm font-bold">← Back</Link><p className="mt-6">Please join first.</p></div>;

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col pb-24 touch-pan-y">
      <header className="bg-[#111] border-b border-[#2a2a2a] sticky top-0 z-20 px-4 py-3 flex justify-between items-center max-w-[600px] mx-auto w-full">
        <Link href="/" className="font-black">← DMs</Link>
        <span className="text-xs bg-white text-black px-2 py-1 rounded-full">{dms.length} msgs</span>
      </header>

      {/* CONSTRAINED TO 480px */}
      <div className="flex-1 w-full max-w-[480px] mx-auto flex flex-col p-3 gap-3">
        {!selected? (
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
            {sortedKeys.length===0 && <p className="p-6 text-sm opacity-50 text-center">No DMs yet. Swipe right to go back to posts.</p>}
            {sortedKeys.map(other=>(
              <button key={other} onClick={()=>setSelected(other)} className="w-full text-left p-4 border-b border-[#2a2a2a] hover:bg-[#2a2a2a] flex justify-between">
                <div><p className="font-bold text-sm">{other}</p><p className="text-xs opacity-60 truncate max-w-[200px]">{convos[other][0]?.message}</p></div>
                <span className="text-[10px] bg-[#333] px-2 py-1 rounded-full h-fit">{convos[other].length}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] flex flex-col h-[75vh]">
            <div className="p-4 border-b border-[#2a2a2a] bg-[#111] rounded-t-2xl flex justify-between">
              <p className="font-black">{selected}</p>
              <button onClick={()=>setSelected(null)} className="bg-[#2a2a2a] px-3 py-1 rounded-full text-xs">Back</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0a]">
              {activeMessages.map((m:any)=>{
                const isMe=m.from_user===profile.full_name;
                return (
                  <div key={m.id} className={`flex ${isMe?'justify-end':'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe?'bg-white text-black':'bg-[#2a2a2a] text-white'}`}>
                      {m.message||m.body}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-[#2a2a2a] flex gap-2 bg-[#111] rounded-b-2xl">
              <input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>e.key==='Enter'&&reply.trim()&& (async()=>{await supabase.from('dms').insert({from_user:profile.full_name,to_user:selected,message:reply,body:reply}); setReply(''); loadDMs();})()} placeholder={`Reply...`} className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-full px-4 py-3 text-sm outline-none" />
              <button onClick={async()=>{ if(!reply.trim()) return; await supabase.from('dms').insert({from_user:profile.full_name,to_user:selected,message:reply,body:reply}); setReply(''); loadDMs(); }} className="bg-white text-black px-5 py-3 rounded-full text-sm font-black">Send</button>
            </div>
          </div>
        )}
      </div>

      {/* SAME BOTTOM BAR AS POSTS PAGE */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur border-t border-[#2a2a2a] p-3 flex gap-2 z-40 max-w-[600px] mx-auto">
        <Link href="/dms" className="flex-1 bg-white text-black py-3 rounded-full font-bold text-sm text-center">DMs</Link>
        <Link href="/" className="flex-1 bg-[#2a2a2a] text-white py-3 rounded-full font-bold text-sm text-center">Posts</Link>
      </div>
    </div>
  );
}
