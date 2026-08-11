'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const KC_LAT = 39.0997;
const KC_LNG = -94.5786;
const RADIUS = 40;

function dist(lat1:number,lng1:number,lat2:number,lng2:number){
  const R=3959;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export default function Home(){
  const [profile,setProfile]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [showJoin,setShowJoin]=useState(false);
  const [showPost,setShowPost]=useState(false);
  const [fullName,setFullName]=useState('');
  const [street,setStreet]=useState('');
  const [zip,setZip]=useState('');
  const [geoVerified,setGeoVerified]=useState(false);
  const [geoDist,setGeoDist]=useState<number|null>(null);
  const [postText,setPostText]=useState('');
  const [photo,setPhoto]=useState<string|null>(null);
  const [coords,setCoords]=useState<any>(null);

  useEffect(()=>{
    const p=localStorage.getItem('nkc_profile');
    if(p) setProfile(JSON.parse(p));
    if(localStorage.getItem('nkc_geo_verified')) setGeoVerified(true);
    load();
  },[]);

  async function load(){
    const {data}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(50);
    if(data) setPosts(data);
  }

  function verifyGeo(){
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat=pos.coords.latitude;
      const lng=pos.coords.longitude;
      const d=dist(lat,lng,KC_LAT,KC_LNG);
      setCoords({lat,lng});
      setGeoDist(d);
      if(d<=RADIUS){
        setGeoVerified(true);
        localStorage.setItem('nkc_geo_verified','true');
        alert(`✅ Verified! ${d.toFixed(1)}mi from KC`);
      } else alert(`❌ ${d.toFixed(1)}mi away - must be within 40mi`);
    },()=>alert('Allow location to verify'));
  }

  function join(){
    if(!fullName||!street||!zip) return alert('Fill all');
    if(!geoVerified) return alert('Verify location first 📍');
    const prof={full_name:fullName,street,zip,geo:coords};
    localStorage.setItem('nkc_profile',JSON.stringify(prof));
    setProfile(prof);
    setShowJoin(false);
  }

  async function createPost(){
    if(!postText&&!photo) return alert('Add text or photo');
    const {error}=await supabase.from('posts').insert({
      author_name:profile.full_name,
      street:profile.street,
      zip:profile.zip,
      body:postText,
      text:postText,
      image_url:photo,
      photo_url:photo,
    } as any);
    if(error) alert(error.message);
    else {setPostText('');setPhoto(null);setShowPost(false);load();}
  }

  async function del(id:string){
    await supabase.from('posts').delete().eq('id',id);
    load();
  }

  const isAdmin=profile?.full_name?.toLowerCase().includes('bean');
  const cst=new Date().toLocaleString('en-US',{timeZone:'America/Chicago'});

  return(
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      <div className="sticky top-0 bg-black/90 border-b border-white/10 p-4 flex justify-between">
        <b>Neighborly KC</b>
        <span className="text-[10px] opacity-60">{cst} CST</span>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {posts.map(p=>(
          <div key={p.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between">
              <div>
                <div className="font-bold text-sm">{p.author_name}</div>
                <div className="text-[10px] opacity-50">{p.street} • {p.zip} • {new Date(p.created_at).toLocaleString('en-US',{timeZone:'America/Chicago'})}</div>
              </div>
              {(profile?.full_name===p.author_name||isAdmin)&&<button onClick={()=>del(p.id)} className="text-[10px] bg-red-900/60 px-3 py-1 rounded-full h-fit">Delete</button>}
            </div>
            <div className="mt-3 text-sm">{p.body||p.text}</div>
            {(p.image_url||p.photo_url)&&<img src={p.image_url||p.photo_url} className="mt-3 rounded-xl w-full"/>}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 flex justify-around py-3 max-w-md mx-auto">
        <button onClick={()=>setShowPost(false)} className="text-xs">🏠 Home</button>
        <button onClick={()=>profile?setShowPost(true):setShowJoin(true)} className="bg-white text-black w-10 h-10 rounded-full font-bold text-xl">+</button>
        <button className="text-xs">💬 DM</button>
      </div>

      {showJoin&&<div className="fixed inset-0 bg-black/80 z-20 flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] w-full max-w-sm rounded-2xl p-6 border border-white/10">
          <h2 className="font-bold mb-4">Join - Geo Verify</h2>
          <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full Name" className="w-full bg-black border border-white/10 rounded-full px-4 py-2 mb-2 text-sm"/>
          <input value={street} onChange={e=>setStreet(e.target.value)} placeholder="Street" className="w-full bg-black border border-white/10 rounded-full px-4 py-2 mb-2 text-sm"/>
          <input value={zip} onChange={e=>setZip(e.target.value)} placeholder="ZIP" className="w-full bg-black border border-white/10 rounded-full px-4 py-2 mb-3 text-sm"/>
          <button onClick={verifyGeo} className={`w-full py-2 rounded-full text-xs mb-3 ${geoVerified?'bg-green-600':'bg-blue-600'}`}>{geoVerified?`✅ Verified ${geoDist?.toFixed(1)}mi`:'📍 Verify Location (40mi radius)'}</button>
          <div className="flex gap-2"><button onClick={()=>setShowJoin(false)} className="flex-1 py-2 rounded-full bg-white/10 text-sm">Cancel</button><button onClick={join} className="flex-1 py-2 rounded-full bg-white text-black text-sm font-bold">Join</button></div>
        </div>
      </div>}

      {showPost&&<div className="fixed inset-0 bg-black/80 z-20 flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] w-full max-w-sm rounded-2xl p-6 border border-white/10">
          <h2 className="font-bold mb-4">New Post</h2>
          <textarea value={postText} onChange={e=>setPostText(e.target.value)} placeholder="What's happening?" className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm min-h-[80px]"/>
          <input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setPhoto(r.result as string); r.readAsDataURL(f);}} className="mt-3 text-xs"/>
          {photo&&<img src={photo} className="mt-3 rounded-xl w-full"/>}
          <div className="flex gap-2 mt-4"><button onClick={()=>setShowPost(false)} className="flex-1 py-2 rounded-full bg-white/10 text-sm">Cancel</button><button onClick={createPost} className="flex-1 py-2 rounded-full bg-white text-black text-sm font-bold">Post</button></div>
        </div>
      </div>}
    </div>
  );
}
