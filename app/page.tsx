"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

export default function Page(){
  const [userName, setUserName] = useState('');
  const [entered, setEntered] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [dmTo, setDmTo] = useState('');
  const [dmText, setDmText] = useState('');
  const [notifOn, setNotifOn] = useState(false);

  useEffect(()=>{
    const saved = localStorage.getItem('nk_name');
    if(saved){ setUserName(saved); setEntered(true); }
    loadPosts();
    if('Notification' in window && Notification.permission==='granted') setNotifOn(true);
  },[]);

  const loadPosts = async ()=>{
    const { data } = await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(50);
    if(data) setPosts(data);
  };

  const enablePush = async ()=>{
    try{
      if(!('serviceWorker' in navigator) ||!('PushManager' in window)){ alert('Push not supported'); return; }
      const perm = await Notification.requestPermission();
      if(perm!=='granted'){ alert('Allow notifications'); return; }
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
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ user_name: userName, subscription: sub })
      });
      setNotifOn(true);
      alert('DM buzz ON!');
    }catch(e:any){
      alert('Push error: '+e.message);
    }
  };

  const handleEnter = ()=>{
    if(!userName.trim()) return;
    localStorage.setItem('nk_name', userName.trim());
    setEntered(true);
  };

  const addPost = async ()=>{
    if(!text.trim()) return;
    await supabase.from('posts').insert({ user_name: userName, content: text });
    setText(''); loadPosts();
  };

  const sendDM = async ()=>{
    if(!dmTo.trim() ||!dmText.trim()) return;
    await supabase.from('dms').insert({ from_user: userName, to_user: dmTo, message: dmText });
    await fetch('/api/push/send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ to: dmTo, from: userName, message: dmText })
    });
    setDmText(''); setDmTo(''); alert('Sent!');
  };

  if(!entered) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4">Neighborly KC 🔔</h1>
        <input value={userName} onChange={e=>setUserName(e.target.value)} placeholder="Your name" className="w-full border p-3 rounded-xl mb-3"/>
        <button onClick={handleEnter} className="w-full bg-black text-white p-3 rounded-xl">Enter</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-bold text-xl">Hi {userName} 👋</h1>
        <button onClick={enablePush} className={`text-xl px-3 py-1 rounded-full border ${notifOn?'bg-green-100':''}`}>🔔</button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow">
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="What's happening nearby?" className="w-full border p-3 rounded-xl"/>
        <button onClick={addPost} className="mt-2 bg-black text-white px-4 py-2 rounded-xl">Post</button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow space-y-2">
        <h2 className="font-bold">Send DM</h2>
        <input value={dmTo} onChange={e=>setDmTo(e.target.value)} placeholder="To (name)" className="w-full border p-2 rounded-xl"/>
        <input value={dmText} onChange={e=>setDmText(e.target.value)} placeholder="Message" className="w-full border p-2 rounded-xl"/>
        <button onClick={sendDM} className="bg-black text-white px-4 py-2 rounded-xl">Send + Buzz</button>
      </div>

      <div className="space-y-3">
        {posts.map((p:any)=>(
          <div key={p.id} className="bg-white p-4 rounded-2xl shadow">
            <div className="font-bold text-sm">{p.user_name}</div>
            <div>{p.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
