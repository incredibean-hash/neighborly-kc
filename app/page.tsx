"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

const CATEGORIES = ["All", "General", "For Sale & Free", "Safety Alert", "Recommendation", "Events", "Lost & Found"];

export default function Page(){
  const [userName, setUserName] = useState('');
  const [entered, setEntered] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [cat, setCat] = useState('General');
  const [filter, setFilter] = useState('All');
  const [notifOn, setNotifOn] = useState(false);

  useEffect(()=>{
    const saved = localStorage.getItem('nk_name');
    if(saved){ setUserName(saved); setEntered(true); }
    loadPosts();
    if(typeof window!=='undefined' && 'Notification' in window && Notification.permission==='granted') setNotifOn(true);
  },[]);

  const loadPosts = async ()=>{
    const { data } = await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100);
    if(data) setPosts(data);
  };

  const enablePush = async ()=>{
    try{
      if(!('serviceWorker' in navigator)){ alert('Push not supported'); return; }
      const perm = await Notification.requestPermission();
      if(perm!=='granted') return;
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
        return outputArray;
      };

      let sub = await reg.pushManager.getSubscription();
      if(!sub){
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as any
        });
      }
      await fetch('/api/push/subscribe',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ user_name: userName, subscription: sub })
      });
      setNotifOn(true);
    }catch(e:any){ alert('Push error: '+e.message); }
  };

  const handleEnter = ()=>{
    if(!userName.trim()) return;
    localStorage.setItem('nk_name', userName.trim());
    setEntered(true);
  };

  const addPost = async ()=>{
    if(!text.trim()) return;
    await supabase.from('posts').insert({ user_name: userName, content: text, category: cat });
    setText(''); loadPosts();
  };

  const filtered = filter==='All'? posts : posts.filter((p:any)=>p.category===filter ||!p.category && filter==='General');

  if(!entered) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8f5ee]">
      <div className="bg-white p-10 rounded- shadow-xl w-full max-w-md border-2 border-black/5">
        <h1 className="text-4xl font-black mb-2">Neighborly KC</h1>
        <p className="text-lg text-gray-600 mb-6">Parkwood Hills • Kansas City</p>
        <input value={userName} onChange={e=>setUserName(e.target.value)} placeholder="Your name (e.g. Jason Bean)" className="w-full border-2 border-black p-4 rounded-2xl text-xl mb-4 focus:outline-none"/>
        <button onClick={handleEnter} className="w-full bg-black text-white p-4 rounded-2xl text-xl font-bold">Enter Neighborhood</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f5ee] p-4 md:p-8">
      <div className="max-w- mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-black text-2xl">Neighborly KC <span className="font-normal text-gray-500 text-lg ml-2">Parkwood Hills</span></h1>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">Hi {userName} 👋</span>
            <button onClick={enablePush} title="DM Buzz" className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center border-2 border-black/10 shadow-sm ${notifOn?'bg-green-200':'bg-white'}`}>🔔</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_280px] gap-6">
          {/* LEFT */}
          <div className="space-y-2">
            {CATEGORIES.map(c=>(
              <button key={c} onClick={()=>setFilter(c)} className={`w-full text-left px-4 py-3 rounded-full font-bold text- border ${filter===c?'bg-[#1a3d2e] text-white':'bg-white text-black/70 hover:bg-black/5'}`}>{c}</button>
            ))}
          </div>

          {/* CENTER */}
          <div className="space-y-4">
            <div className="bg-white rounded- p-5 shadow-sm border border-black/5">
              <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Share with neighbors..." className="w-full min-h- border-2 border-black/10 p-4 rounded-2xl text-lg focus:outline-none resize-none"/>
              <div className="flex justify-between items-center mt-3">
                <select value={cat} onChange={e=>setCat(e.target.value)} className="border-2 border-black/10 rounded-full px-4 py-2 font-bold text-sm">
                  {CATEGORIES.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}
                </select>
                <button onClick={addPost} className="bg-black text-white px-6 py-2 rounded-full font-bold text-lg">Post</button>
              </div>
            </div>

            <div className="space-y-3">
              {filtered.map((p:any)=>(
                <div key={p.id} className="bg-white rounded- p-5 shadow-sm border border-black/5">
                  <div className="flex justify-between">
                    <span className="font-black text-base">{p.user_name}</span>
                    <span className="text-xs bg-black/5 px-3 py-1 rounded-full font-bold">{p.category||'General'}</span>
                  </div>
                  <div className="mt-2 text- leading-relaxed">{p.content}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <div className="bg-white rounded- p-5 shadow-sm border border-black/5">
              <h3 className="font-black text-lg mb-3">Parkwood Hills</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f8f5
