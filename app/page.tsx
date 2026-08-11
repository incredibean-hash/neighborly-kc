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
        <div className="text-center">
          <div className="text-xl font-black tracking-widest">Neighborly KC</div>
          <div className="text-[11px] opacity-50 mt-1">Kansas City • 40 Mile Radius</div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto justify-center">
          {CATS.map(c=><button key={c} onClick={()=>setFilter(c)} className={`px-5 py-2 rounded-full text-sm font-bold ${filter===c?'bg-white text-black':'bg-white/10'}`}>{c}</button>)}
        </div>
      </div>
      <div className="max-w-md mx-auto p-4 space-y-4">
        {shown.map((p:any)=>(
          <div key={p.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
            <div className="flex justify-between">
              <div>
                <div className="font-bold text-base">{p.author_name}</div>
                <div className="text-xs opacity-50 mt-1">{p.category} • {p.area||p.zip+' Area'}</div>
              </div>
              {(profile&&(profile.full_name===p.author_name||isAdmin))&&<button onClick={()=>del(p.id)} className="text-xs bg-red-900/60 px-4 py-1 rounded-full h-fit">Delete</button>}
            </div>
            <div className="mt-3 text-[15px]">{p.body||p.text}</div>
            {(p.image_url||p.photo_url)&&<img src={p.image_url||p.photo_url} className="mt-4 rounded-xl w-full"/>}
            <button onClick={()=>{setDmTo(p.author_name); setShowDM(true);}} className="mt-4 w-full bg-white text-black py-3 rounded-full font-black text-sm">DM {p.author_name.split(' ')[0]}</button>
          </div>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 flex justify-around items-center py-4 max-w-md mx-auto">
        <button className="text-sm font-bold">Home</button>
        <button onClick={()=>setShowPost(true)} className="bg-white text-black w-14 h-14 rounded-full font-black text-2xl">+</button>
        <button onClick={()=>{loadDMs();setShowDM(true);}} className="text-sm font-bold">DM</button>
      </div>
      {showPost&&<div className="fixed inset-0 bg-black/80 z-20 flex items-center justify-center p-4"><div className="bg-[#1a1a1a] w-full max-w-sm rounded-2xl p-6 border border-white/10">
        <h2 className="font-bold text-lg text-center mb-4">New Post</h2>
        <div className="flex gap-2 mb-4 overflow-x-auto justify-center">{CATS.filter(c=>c!=='All').map(c=><button key={c} onClick={()=>setCat(c)} className={`px-4 py-2 rounded-full text-xs font-bold ${cat===c?'bg-white text-black':'bg-white/10'}`}>{c}</button>)}</div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Whats happening?" className="w-full bg-black border border-white/10 rounded-xl p-4 text-base min-h-[100px]"/>
        <input type="file" accept="image/*" onChange={e=>{const f=e.target.files&&e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>setPhoto(r.result as string); r.readAsDataURL(f);}} className="mt-4 text-sm"/>
        {photo&&<img src={photo} className="mt-4 rounded-xl w-full"/>}
        <div className="flex gap-3 mt-6"><button onClick={()=>setShowPost(false)} className="flex-1 py-3 rounded-full bg-white/10 font-bold">Cancel</button><button onClick={doPost} className="flex-1 py-3 rounded-full bg-white text-black font-black">Post</button></div>
      </div></div>}
      {showDM&&<div className="fixed inset-0 bg-black/80 z-20 flex items-center justify-center p-4"><div className="bg-[#1a1a1a] w-full max-w-sm rounded-2xl p-6 border border-white/10 max-h-[80vh] overflow-auto">
        <h2 className="font-bold text-lg text-center mb-4">DM {dmTo}</h2>
        <input value={dmTo} onChange={e=>setDmTo(e.target.value)} placeholder="To Full Name" className="w-full bg-black border border-white/10 rounded-full px-5 py-3 mb-3 text-base"/>
        <textarea value={dmMsg} onChange={e=>setDmMsg(e.target.value)} placeholder="Message" className="w-full bg-black border border-white/10 rounded-xl p-4 text-base mb-3 min-h-[80px]"/>
        <button onClick={sendDM} className="w-full bg-white text-black py-4 rounded-full font-black text-base mb-6">Send DM</button>
        <div className="space-y-2">{dms.map((m:any)=><div key={m.id} className="bg-black/50 p-3 rounded-xl text-sm"><b>{m.from_user} → {m.to_user}</b><div className="mt-1">{m.message}</div></div>)}</div>
        <button onClick={()=>setShowDM(false)} className="w-full mt-6 py-3 rounded-full bg-white/10 font-bold">Close</button>
      </div></div>}
    </div>
  );
}
