'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const KC_LAT=39.0997, KC_LNG=-94.5786, RADIUS=40;
const CATS=['All','General','Safety','For Sale','Help','Event'];

function dist(a:number,b:number,c:number,d:number){
  const R=3959, dLat=(c-a)*Math.PI/180, dLng=(d-b)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function areaFromZip(zip:string){
  if(!zip) return 'Kansas City Area';
  return `${zip} Area • KC`; // hides exact street
}

export default function Home(){
  const [profile,setProfile]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [filter,setFilter]=useState('All');
  const [showJoin,setShowJoin]=useState(false);
  const [showPost,setShowPost]=useState(false);
  const [showDM,setShowDM]=useState(false);
  const [fullName,setFullName]=useState('');
  const [street,setStreet]=useState(''); // kept private, NOT shown on post
  const [zip,setZip]=useState('');
  const [geoOk,setGeoOk]=useState(false);
  const [geoDist,setGeoDist]=useState<number|null>(null);
  const [coords,setCoords]=useState<any>(null);
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
    loadPosts(); loadDMs();
  },[]);

  async function loadPosts(){
    const {data}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100);
    if(data) setPosts(data);
  }
  async function loadDMs(){
    if(!profile) return;
    const {data}=await supabase.from('dms').select('*').or(`to_user.eq.${profile.full_name},from_user.eq.${profile.full_name}`).order('created_at',{ascending:false}).limit(50);
    if(data) setDms(data);
  }

  function verifyGeo(){
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat=pos.coords.latitude,lng=pos.coords.longitude;
      const d=dist(lat,lng,KC_LAT,KC_LNG);
      setCoords({lat,lng}); setGeoDist(d);
      if(d<=RADIUS){ setGeoOk(true); localStorage.setItem('nkc_geo_verified','true'); alert(`✅ Verified ${d.toFixed(1)}mi from KC`);}
      else alert(`❌ ${d.toFixed(1)}mi away - must be within 40mi`);
    });
  }

  function join(){
    if(!fullName||!street||!zip) return alert('Fill all');
    if(!geoOk) return alert('Verify location first 📍');
    const prof={full_name:fullName,street,zip,geo:coords};
    localStorage.setItem('nkc_profile',JSON.stringify(prof));
    setProfile(prof); setShowJoin(false);
  }

  async function createPost(){
    if(!text&&!photo) return alert('Add text or photo');
    const {error}=await supabase.from('posts').insert({
      author_name:profile.full_name,
      street:profile.street
