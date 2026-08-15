'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/community';
import { useAppTheme } from '../../lib/use-theme';
export default function NotificationsPage(){
 const theme=useAppTheme();
 const [items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true);
 const load=async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return;}const {data}=await supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);setItems(data||[]);setLoading(false)};
 useEffect(()=>{load();const ch=supabase.channel('nkc-notifications').on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},payload=>setItems(x=>[payload.new,...x])).subscribe();return()=>{supabase.removeChannel(ch)}},[]);
 const markRead=async(id:string)=>{const now=new Date().toISOString();const {error}=await supabase.from('notifications').update({read_at:now}).eq('id',id);if(error)return alert(error.message);setItems(x=>x.map(n=>n.id===id?{...n,read_at:now}:n))};
 return <main className="min-h-screen" style={{backgroundColor:theme.bg,color:theme.text}}><header className="p-4" style={{backgroundColor:theme.header,color:'#fff'}}><div className="max-w-2xl mx-auto"><Link href="/" className="text-xs opacity-70">← Feed</Link><h1 className="font-black text-2xl">Notifications</h1><p className="text-xs opacity-70">Likes, comments, messages and connections</p></div></header><div className="max-w-2xl mx-auto p-4 space-y-2">{loading?<div className="text-center py-16 opacity-50">Loading…</div>:!items.length?<div className="rounded-2xl p-10 text-center opacity-60" style={{backgroundColor:theme.card,border:`1px solid ${theme.border}`}}>You're all caught up.</div>:items.map(n=><button key={n.id} onClick={()=>markRead(n.id)} className={`w-full text-left rounded-2xl p-4 border`} style={{backgroundColor:n.read_at?theme.card:theme.input,borderColor:theme.border}}><div className="flex gap-3"><span className="text-xl">{n.type==='message'?'💬':n.type==='comment'?'🗨️':n.type==='connection'?'👥':'❤️'}</span><div className="flex-1"><p className="font-medium">{n.message}</p><small className="opacity-40">{new Date(n.created_at).toLocaleString()}</small></div>{!n.read_at&&<span className="w-2 h-2 rounded-full mt-2" style={{backgroundColor:theme.accent}}/>}</div></button>)}</div></main>;
}
