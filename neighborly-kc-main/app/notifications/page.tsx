'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function NotificationsPage(){
 const router=useRouter(); const [items,setItems]=useState<any[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{let ch:any;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return;} const {data}=await supabase.from('notifications').select('*').order('created_at',{ascending:false}).limit(100);setItems(data||[]); ch=supabase.channel(`notifications-${user.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${user.id}`},p=>setItems(x=>[p.new,...x])).subscribe(); setLoading(false);})();return()=>{if(ch)supabase.removeChannel(ch)}},[]);
 const markRead=async(id:string)=>{await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id);setItems(x=>x.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n))};
 if(loading)return <main className="min-h-screen bg-[#070a0f] text-white grid place-items-center">Loading…</main>;
 return <main className="min-h-screen bg-[#070a0f] text-white"><header className="sticky top-0 bg-[#0a0d14]/95 backdrop-blur border-b border-white/10 p-4"><div className="max-w-2xl mx-auto flex gap-3 items-center"><button onClick={()=>router.push('/')} className="w-10 h-10 rounded-full bg-white/10">←</button><div><h1 className="font-black text-xl">Notifications</h1><p className="text-xs text-white/50">Likes, comments and messages</p></div></div></header><div className="max-w-2xl mx-auto p-4 space-y-2">{!items.length&&<div className="text-center text-white/40 py-16">You're all caught up.</div>}{items.map(n=><button key={n.id} onClick={()=>markRead(n.id)} className={`w-full text-left rounded-2xl p-4 border border-white/10 ${n.read_at?'bg-white/[.03]':'bg-[#1976ff]/15'}`}><div className="flex gap-3"><span className="text-xl">{n.type==='message'?'💬':n.type==='comment'?'🗨️':'❤️'}</span><div className="flex-1"><p>{n.message}</p><small className="text-white/40">{new Date(n.created_at).toLocaleString()}</small></div>{!n.read_at&&<span className="w-2 h-2 rounded-full bg-[#1976ff] mt-2"/></div></button>)}</div></main>
}
