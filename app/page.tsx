'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

function getSupabase(){
  if(typeof window==='undefined') return null;
  const u=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const k=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!u||!k) return null;
  return createClient(u,k);
}
function formatCST(iso:string){
  try{ return new Date(iso).toLocaleString('en-US',{timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true})+' CST'; }
  catch{ return new Date(iso).toLocaleString(); }
}

export default function Page(){
  const router=useRouter();
  const [supabase,setSupabase]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [showDM,setShowDM]=useState<any>(null);
  const [dmText,setDmText]=useState('');
  const [name,setName]=useState('');
  const [addr,setAddr]=useState('');
  const [menu,setMenu]=useState(false);

  useEffect(()=>{
    let sx=0;
    const s=(e:TouchEvent)=>{ sx=e.touches[0].clientX; };
    const e=(e:TouchEvent)=>{ const dx=sx-e.changedTouches[0].clientX; if(dx>80) router.push('/dms'); };
    window.addEventListener('touchstart',s); window.addEventListener('touchend',e);
    return()=>{ window.removeEventListener('touchstart',s); window.removeEventListener('touchend',e); }
  },[]);

  useEffect(()=>{
    const sb=getSupabase(); setSupabase(sb);
    const raw=localStorage.getItem('nkc_profile');
    if(raw){ try{ const p=JSON.parse(raw); if(!p.user_id){ p.user_id=crypto.randomUUID(); localStorage.setItem('nkc_profile',JSON.stringify(p)); } setProfile(p); }catch{} }
  },[]);

  useEffect(()=>{ (async()=>{
    if(!supabase) return;
    const {data}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100);
    if(data) setPosts(data);
  })(); },[supabase]);

  const isJason=profile?.full_name?.toLowerCase().includes('jason bean');

  return(
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] pb-24">
      <header className="bg-[#111] border-b border-[#2a2a2a] sticky top-0 z-30">
        <div className="max-w-[600px] mx-auto px-4 py-3 grid grid-cols-3 items-center">
          <img src="/icon-192.png" alt="logo" className="w-8 h-8 rounded-lg bg-white" />
          <h1 className="font-black text-center">Neighborly KC</h1>
          <div className="flex justify-end">
            {!profile? <button onClick={()=>setShowJoin(true)} className="bg-white text-black px-4 py-1.5 rounded-full font-bold text-xs">Join</button> :
              <div className="relative"><button onClick={()=>setMenu(!menu)} className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-full text-xs truncate max-w-[110px]">{profile.full_name}</button>
                {menu&&<div className="absolute right-0 mt-2 bg-[#1a1a1a] border border-[#333] rounded-xl p-2 w-36"><button onClick={()=>{localStorage.clear(); setProfile(null); setMenu(false); location.reload();}} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[#2a2a2a] rounded-lg">Log out</button></div>}
              </div>
            }
          </div>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto p-4 space-y-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?'What\'s up?':'Join to post...'} className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-3 min-h-[80px] text-sm text-white outline-none" />
          <div className="flex justify-end mt-2">
            <button onClick={async()=>{
              if(!profile){ setShowJoin(true); return; }
              if(!supabase||!body.trim()) return;
              const {data,error}=await supabase.from('posts').insert({body:body.trim(), author_name:profile.full_name}).select().single();
              if(error){ alert(error.message); return; }
              setPosts([data,...posts]); setBody('');
            }} className="bg-white text-black px-5 py-2 rounded-full text-xs font-bold">Post</button>
          </div>
        </div>

        {posts.map((p:any)=>{
          const canDelete=profile&&(p.author_name===profile.full_name || isJason);
          return(
            <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
              <div className="flex justify-between"><div><p className="text-xs font-bold">{p.author_name}{isJason&&p.author_name?.toLowerCase().includes('jason')?' ✅':''}</p><p className="text-[10px] opacity-40">{formatCST(p.created_at)}</p></div>
                {canDelete&&<button onClick={async()=>{ if(!confirm('Delete?')) return; await supabase.from('posts').delete().eq('id',p.id); setPosts(posts.filter(x=>x.id!==p.id)); }} className="text-[10px] bg-[#2a2a2a] px-3 py-1 rounded-full hover:text-red-400">Delete</button>}
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{p.body}</p>
              <button onClick={()=>setShowDM(p)} className="mt-3 text-[11px] bg-[#2a2a2a] px-3 py-1 rounded-full">💬 DM {p.author_name?.split(' ')[0]}</button>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#111]/95 border-t border-[#2a2a2a] p-3 flex gap-2 max-w-[600px] mx-auto">
        <a href="/dms" className="flex-1 bg-[#2a2a2a] text-white py-3 rounded-full text-center text-xs font-bold">DMs</a>
        <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} className="flex-1 bg-white text-black py-3 rounded-full text-xs font-bold">Posts</button>
      </div>

      {showDM&&<div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"><div className="bg-[#e5e5e5] text-black rounded-2xl w-full max-w-sm p-6"><div className="flex justify-between mb-3"><h2 className="font-black">DM {showDM.author_name}</h2><button onClick={()=>setShowDM(null)} className="w-8 h-8 rounded-full bg-black text-white">✕</button></div><textarea value={dmText} onChange={e=>setDmText(e.target.value)} className="w-full bg-white border rounded-xl p-3 text-sm text-black" /><div className="flex gap-2 mt-3"><button onClick={()=>setShowDM(null)} className="flex-1 bg-[#2a2a2a] text-white py-3 rounded-full text-xs">Cancel</button><button onClick={async()=>{ if(!dmText.trim()) return; await supabase.from('dms').insert({from_user:profile.full_name,to_user:showDM.author_name,message:dmText,body:dmText}); setDmText(''); setShowDM(null); }} className="flex-1 bg-black text-white py-3 rounded-full text-xs font-bold">Send</button></div></div></div>}

      {showJoin&&<div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"><div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-sm p-6"><h2 className="font-black">Join Neighborly KC</h2><input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-3 mt-4 text-sm text-white" /><input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Address" className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-3 mt-2 text-sm text-white" /><div className="flex gap-2 mt-4"><button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#2a2a2a] py-3 rounded-full text-xs">Cancel</button><button onClick={()=>{ if(!name.trim()){ alert('Name required'); return; } const uid=crypto.randomUUID(); const pr={user_id:uid, full_name:name.trim(), street_address:addr.trim(), is_verified:false}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false); setName(''); setAddr(''); }} className="flex-1 bg-white text-black py-3 rounded-full font-bold text-xs">Join</button></div></div></div>}
    </div>
  );
}
