'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const CATS=['All','General','Safety','For Sale','Help','Event'];
export default function Page(){
  const [profile,setProfile]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [filter,setFilter]=useState('All');
  const [showPost,setShowPost]=useState(false);
  const [text,setText]=useState('');
  const [cat,setCat]=useState('General');
  const [photo,setPhoto]=useState<string|null>(null);
  const [dmTo,setDmTo]=useState('');
  const [showDM,setShowDM]=useState(false);
  const [dmMsg,setDmMsg]=useState('');
  const [dms,setDms]=useState<any[]>([]);
  useEffect(()=>{const p=localStorage.getItem('nkc_profile'); if(p) setProfile(JSON.parse(p)); load();},[]);
  async function load(){const {data}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100); if(data)setPosts(data);}
  async function loadDMs(){const {data}=await supabase.from('dms').select('*').order('created_at',{ascending:false}).limit(50); if(data)setDms(data);}
  async function doPost(){if(!text&&!photo)return; await supabase.from('posts').insert({author_name:profile.full_name,zip:profile.zip,area:profile.zip+' Area',body:text,text:text,category:cat,image_url:photo,photo_url:photo}); setText('');setPhoto(null);setShowPost(false);load();}
  async function sendDM(){if(!dmTo||!dmMsg)return; await supabase.from('dms').insert({from_user:profile.full_name,to_user:dmTo,message:dmMsg,body:dmMsg}); setDmMsg(''); alert('DM Sent'); loadDMs();}
  async function del(id:string){await supabase.from('posts').delete().eq('id',id); load();}
  const isAdmin=profile&&profile.full_name.toLowerCase().includes('bean');
  const shown=filter==='All'?posts:posts.filter((p:any)=>p.category===filter);
  return(
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 bg-black border-b border-white/10 p-4 z-10">
        <b>Neighborly KC</b>
        <div className="flex gap-2 mt-3 overflow-x-auto">{CATS.map(c=><button key={c} onClick={()=>setFilter(c)} className={`px-3 py-1 rounded-full text-xs ${filter===c?'bg-white text-black':'bg-white/10'}`}>{c}</button>)}</div>
      </div>
      <div className="max-w-md mx-auto p-4 space-y-4">
        {shown.map((p:any)=>(
          <div key={p.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between">
              <div>
                <div className="font-bold text-sm">{p.author_name} <span className="ml-2 text-[9px] bg-white/10 px-2 py-0.5 rounded-full">{p.category||'General'}</span></div>
                <div className="text-[10px] opacity-50">{p.area||p.zip+' Area'} • {new Date(p.created_at).toLocaleDateString()}</div>
              </div>
              {(profile&&(profile.full_name===p.author_name||isAdmin))&&<button onClick={()=>del(p.id)} className="text-[10px] bg-red-900/60 px-3 py-1 rounded-full h-fit">Delete</button>}
            </div>
            <div className="mt-2 text-sm">{p.body||p.text}</div>
            {(p.image_url||p.photo_url)&&<img src={p.image_url||p.photo_url} className="mt-3 rounded-xl w-full"/>}
            <button onClick={()=>{setDmTo(p.author_name); setShowDM(true);}} className="mt-3 text-xs bg-white text-black px-4 py-1.5 rounded-full font-bold">DM {p.author_name.split(' ')[0]}</button>
          </div>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 flex justify-around items-center py-3 max-w-md mx-auto">
        <button className="text-xs">Home</button>
        <button onClick={()=>setShowPost(true)} className="bg-white text-black w-12 h-12 rounded-full font-bold text-xl">+</button>
        <button onClick={()=>{loadDMs();setShowDM(true);}} className="text-xs">DM</button>
      </div>
      {showPost&&<div className="fixed inset-0 bg-black/80 z-20 flex items-center justify-center p-4"><div className="bg-[#1a1a1a] w-full max-w-sm rounded-2xl p-6 border border-white/10">
        <h2 className="font-bold mb-3">New Post</h2>
        <div className="flex gap-2 mb-3 overflow-x-auto">{CATS.filter(c=>c!=='All').map(c=><button key={c} onClick={()=>setCat(c)} className={`px-3 py-1 rounded-full text-xs ${cat===c?'bg-white text-black':'bg-white/10'}`}>{c}</button>)}</div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Whats happening?" className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm min-h-[80px]"/>
        <input type="file" accept="image/*" onChange={e=>{const f=e.target.files&&e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>setPhoto(r.result as string); r.readAsDataURL(f);}} className="mt-3 text-xs"/>
        {photo&&<img src={photo} className="mt-3 rounded-xl w-full"/>}
        <div className="flex gap-2 mt-4"><button onClick={()=>setShowPost(false)} className="flex-1 py-2 rounded-full bg-white/10">Cancel</button><button onClick={doPost} className="flex-1 py-2 rounded-full bg-white text-black font-bold">Post</button></div>
      </div></div>}
      {showDM&&<div className="fixed inset-0 bg-black/80 z-20 flex items-center justify-center p-4"><div className="bg-[#1a1a1a] w-full max-w-sm rounded-2xl p-6 border border-white/10 max-h-[80vh] overflow-auto">
        <h2 className="font-bold mb-3">DM {dmTo}</h2>
        <input value={dmTo} onChange={e=>setDmTo(e.target.value)} placeholder="To Name" className="w-full bg-black border border-white/10 rounded-full px-4 py-2 mb-2 text-sm"/>
        <textarea value={dmMsg} onChange={e=>setDmMsg(e.target.value)} placeholder="Message" className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm mb-2"/>
        <button onClick={sendDM} className="w-full bg-white text-black py-2 rounded-full font-bold mb-4">Send</button>
        <div className="space-y-2">{dms.map((m:any)=><div key={m.id} className="bg-black/50 p-2 rounded-xl text-xs"><b>{m.from_user} → {m.to_user}</b><div>{m.message}</div></div>)}</div>
        <button onClick={()=>setShowDM(false)} className="w-full mt-4 py-2 rounded-full bg-white/10">Close</button>
      </div></div>}
    </div>
  );
}
