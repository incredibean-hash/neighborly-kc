'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const KC_LAT = 39.0997;
const KC_LNG = -94.5786;
const CATS = ['All','General','Safety','For Sale','Help','Event'];

function getDist(lat1:number,lng1:number,lat2:number,lng2:number){
  const R=3959;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export default function Page(){
  const [profile,setProfile]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [filter,setFilter]=useState('All');
  const [showJoin,setShowJoin]=useState(false);
  const [showPost,setShowPost]=useState(false);
  const [showDM,setShowDM]=useState(false);
  const [fullName,setFullName]=useState('');
  const [street,setStreet]=useState('');
  const [zip,setZip]=useState('');
  const [geoOk,setGeoOk]=useState(false);
  const [geoDist,setGeoDist]=useState<number|null>(null);
  const [text,setText]=useState('');
  const [cat,setCat]=useState('General');
  const [photo,setPhoto]=useState<string|null>(null);
  const [dms,setDms]=useState<any[]>([]);
  const [dmTo,setDmTo]=useState('');
  const [dmMsg,setDmMsg]=useState('');

  useEffect(()=>{
    const p=localStorage.getItem('nkc_profile');
    if(p) setProfile(JSON.parse(p));
    if(localStorage.getItem('nkc_geo_verified')) setGeoOk(true);
    loadPosts();
  },[]);

  async function loadPosts(){
    const {data}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100);
    if(data) setPosts(data);
  }

  async function loadDMs(){
    if(!profile) return;
    const {data}=await supabase.from('dms').select('*').order('created_at',{ascending:false}).limit(50);
    if(data) setDms(data);
  }

  function verifyGeo(){
    navigator.geolocation.getCurrentPosition((pos)=>{
      const d=getDist(pos.coords.latitude,pos.coords.longitude,KC_LAT,KC_LNG);
      setGeoDist(d);
      if(d<=40){
        setGeoOk(true);
        localStorage.setItem('nkc_geo_verified','true');
        alert('Verified! '+d.toFixed(1)+'mi from KC');
      } else {
        alert('Too far: '+d.toFixed(1)+'mi - must be within 40mi');
      }
    });
  }

  function doJoin(){
    if(!fullName ||!street ||!zip){ alert('Fill all'); return; }
    if(!geoOk){ alert('Verify location first'); return; }
    const prof={full_name:fullName,street:street,zip:zip};
    localStorage.setItem('nkc_profile',JSON.stringify(prof));
    setProfile(prof);
    setShowJoin(false);
  }

  async function doPost(){
    if(!text &&!photo){ alert('Add text or photo'); return; }
    const {error}=await supabase.from('posts').insert({
      author_name: profile.full_name,
      street: profile.street,
      zip: profile.zip,
      body: text,
      text: text,
      category: cat,
      area: zip + ' Area',
      image_url: photo,
      photo_url: photo
    });
    if(error){ alert(error.message); return; }
    setText(''); setPhoto(null); setShowPost(false); loadPosts();
  }

  async function sendDM(){
    if(!dmTo ||!dmMsg){ alert('Fill name and message'); return; }
    const {error}=await supabase.from('dms').insert({
      from_user: profile.full_name,
      to_user: dmTo,
      message: dmMsg,
      body: dmMsg
    });
    if(error){ alert(error.message); return; }
    setDmMsg(''); alert('DM Sent'); loadDMs();
  }

  async function delPost(id:string){
    await supabase.from('posts').delete().eq('id',id);
    loadPosts();
  }

  const isAdmin = profile && profile.full_name.toLowerCase().includes('bean');
  const shown = filter==='All'? posts : posts.filter((p:any)=>p.category===filter);
  const cst = new Date().toLocaleString('en-US',{timeZone:'America/Chicago'});

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 bg-black border-b border-white/10 p-4 z-10">
        <div className="flex justify-between text-sm"><b>Neighborly KC</b><span className="text-[10px] opacity-50">{cst} CST</span></div>
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {CATS.map((c)=>(
            <button key={c} onClick={()=>setFilter(c)} className={`px-3 py-1 rounded-full text-xs ${filter===c?'bg-white text-black':'bg-white/10'}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {shown.map((p:any)=>(
          <div key={p.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4">
            <div className="flex justify-between">
              <div>
                <div className="font-bold text-sm">{p.author_name} <span className="ml-2 text-[9px] bg-white/10 px-2 py-0.5 rounded-full">{p.category || 'General'}</span></div>
                <div className="text-[10px] opacity-50">{p.area || (p.zip? p.zip+' Area' : 'KC Area')} - {new Date(p.created_at).toLocaleString('en-US',{timeZone:'America/Chicago'})}</div>
              </div>
              {(profile && (profile.full_name===p.author_name || isAdmin)) && (
                <button onClick={()=>delPost(p.id)} className="text-[10px] bg-red-900/60 px-3 py-1 rounded-full h-fit">Delete</button>
              )}
            </div>
            <div className="mt-2 text-sm">{p.body || p.text}</div>
            {(p.image_url || p.photo_url) && <img src={p.image_url || p.photo_url} alt="" className="mt-3 rounded-xl w-full" />}
            <button onClick={()=>{ setDmTo(p.author_name); setShowDM(true); }} className="mt-3 text-xs bg-white text-black px-4 py-1.5 rounded-full font-bold">DM {p.author_name}</button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 flex justify-around items-center py-3 max-w-md mx-auto">
        <button onClick={()=>{setShowDM(false); setShowPost(false);}} className="text-xs">Home</button>
        <button onClick={()=>{ if(profile) setShowPost(true); else setShowJoin(true); }} className="bg-white text-black w-12 h-12 rounded-full font-bold text-xl">+</button>
        <button onClick={()=>{ loadDMs(); setShowDM(true); }} className="text-xs">DM</button>
      </div>

      {showJoin && (
        <div className="fixed inset-0 bg-black/80 z-20 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] w-full max-w-sm rounded-2xl p-6 border border-white/10">
            <h2 className="font
