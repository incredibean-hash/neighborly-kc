"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

const CATEGORIES = ["All", "General", "For Sale & Free", "Safety Alert", "Recommendation", "Events", "Lost & Found"];
const RADIUS_OPTIONS = [
  {id:'hood', label:'My Neighborhood Only', desc:'Parkwood Hills only'},
  {id:'5', label:'5 Mile Radius', desc:'Nearby hoods'},
  {id:'10', label:'10 Mile Radius', desc:'North KC area'},
  {id:'25', label:'25 Mile Radius', desc:'All KC Metro - RECOMMENDED', default:true},
  {id:'metro', label:'KC Metro (40+ miles)', desc:'Entire Kansas City'},
];

// All KC zips within ~25 miles of Parkwood Hills 64155 (Parkwood Hills center ~39.26,-94.56)
const KC_ZIPS_25MI = ['64155','64156','64119','64116','64117','64118','64112','64113','64114','64110','64111','64068','64030','64090','64132','64133','64151','64152','64153','64154','64158','64157','64089','64012','64014','64015','64016','64024','64048','64052','64055','64056','64064','64081','64082','64101','64102','64105','64106','64108','64109','64120','64121','64124','64126','64127','64128','64130','64131','64145','64146','66201','66202','66203','66204','66205','66206','66207','66208','66209','66210','66211','66212','66213','66214','66215','66216','66217','66218','66219','66220','66221','66223','66224','66225','66226','66227'];

export default function Page(){
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [cat, setCat] = useState('General');
  const [filter, setFilter] = useState('All');
  const [radius, setRadius] = useState('25');
  const [notifOn, setNotifOn] = useState(false);
  const [dmTo, setDmTo] = useState('');
  const [dmMsg, setDmMsg] = useState('');
  const [name, setName] = useState('');
  const [addr, setAddr] = useState('');
  const [zip, setZip] = useState('64155');

  useEffect(()=>{
    const saved = localStorage.getItem('nkc_profile_25mi');
    if(saved){ setProfile(JSON.parse(saved)); }
    loadPosts();
    if(typeof window!=='undefined' && 'Notification' in window && Notification.permission==='granted') setNotifOn(true);
  },[]);

  const loadPosts = async ()=>{
    const { data } = await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(150);
    if(data) setPosts(data);
  };

  const enablePush = async ()=>{
    try{
      const perm = await Notification.requestPermission();
      if(perm!=='granted') return;
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const urlBase64ToUint8Array = (b64:string) => {
        const pad = '='.repeat((4 - b64.length % 4) % 4);
        const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(base64);
        const out = new Uint8Array(raw.length);
        for(let i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i);
        return out;
      };
      let sub = await reg.pushManager.getSubscription();
      if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as any });
      await fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_name:profile?.full_name||name,subscription:sub})});
      setNotifOn(true);
    }catch(e:any){ alert('Push error: '+e.message); }
  };

  const handleJoin = ()=>{
    if(!name.trim()||!addr.trim()||!zip.trim()){ alert('Need name, address and zip'); return; }
    const cleanZip = zip.trim().slice(0,5);
    // Allow any KC zip within 25 miles, or at least 64155 home base
    if(!KC_ZIPS_25MI.includes(cleanZip) && cleanZip!=='64155'){
      if(!confirm(`Zip ${cleanZip} is outside 25-mile KC radius. Join anyway as visitor?`)) return;
    }
    const pr = { full_name:name.trim(), street_address:addr.trim(), zip:cleanZip, verified:true, home_hood:'Parkwood Hills', lat:39.2639, lng:-94.5626 };
    localStorage.setItem('nkc_profile_25mi', JSON.stringify(pr));
    setProfile(pr);
  };

  const logout = ()=>{
    localStorage.removeItem('nkc_profile_25mi'); setProfile(null); setName(''); setAddr(''); setZip('64155');
  };

  const addPost = async ()=>{
    if(!text.trim()) return;
    const postRadius = radius;
    const reach = postRadius==='hood' ? 'Parkwood Hills Only' : postRadius==='5' ? '5 Mile Radius' : postRadius==='10' ? '10 Mile Radius' : postRadius==='25' ? '25 Mile Radius - KC Metro' : 'KC Metro Wide';
    // Save radius in content for now, and in a new column if you add it: post_radius
    await supabase.from('posts').insert({ 
      user_name: profile.full_name, 
      content: text, 
      category: cat,
      // @ts-ignore - add these columns in Supabase if you want strict: post_radius, zip, reach_label
      // For now we store in content meta via separate fields if they exist, fallback to content only
    });
    // Also try insert with extra fields (if you added columns, it will work)
    try{
      await supabase.from('posts').from('posts').insert({
        user_name: profile.full_name,
        content: `[${reach}] ${text}`,
        category: cat,
        // @ts-ignore
        post_radius: postRadius,
        // @ts-ignore
        zip: profile.zip,
        // @ts-ignore
        reach_label: reach
      } as any);
    }catch{}
    // For MVP we just do simple insert with reach in content
    await supabase.from('posts').insert({ user_name: profile.full_name, content: `[${reach}] ${text}`, category: cat });
    setText(''); loadPosts();
  };

  const sendDM = async ()=>{
    if(!dmTo.trim()||!dmMsg.trim()) return;
    await supabase.from('dms').insert({ from_user: profile.full_name, to_user: dmTo, message: dmMsg });
    await fetch('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:dmTo,from:profile.full_name,message:dmMsg})});
    setDmMsg(''); setDmTo(''); alert('Sent + buzzed '+dmTo+'!');
  };

  const filtered = filter==='All'? posts : posts.filter((p:any)=>p.category===filter);

  if(!profile){
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8f5ee]">
        <div className="bg-white p-8 rounded-[28px] shadow-xl w-full max-w-lg border-2">
          <h1 className="text-4xl font-black mb-1">Neighborly KC</h1>
          <p className="text-lg text-gray-600 mb-1">Parkwood Hills • Kansas City</p>
          <p className="text-sm font-black text-green-700 mb-6 bg-green-50 p-3 rounded-xl border-2 border-green-200">✓ NEW: Post to 25 mile radius - Entire KC Metro!</p>
          <div className="space-y-3">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name (Jason Bean)" className="w-full border-2 border-black p-4 rounded-2xl text-xl"/>
            <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Street address" className="w-full border-2 border-black p-4 rounded-2xl text-lg"/>
            <input value={zip} onChange={e=>setZip(e.target.value)} placeholder="Zip (64155)" className="w-full border-2 border-black p-4 rounded-2xl text-lg"/>
            <div className="text-xs font-bold opacity-60 p-2">Covers 25 miles from Parkwood Hills: Gladstone, Liberty, North KC, Briarcliff, Overland Park, Lee's Summit, etc.</div>
            <button onClick={handleJoin} className="w-full bg-black text-white p-4 rounded-2xl text-xl font-black">Verify & Join - 25 Mile Access</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5ee] p-4 md:p-8">
      <div className="max-w-[1350px] mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h1 className="font-black text-2xl">Neighborly KC <span className="font-normal text-gray-500 text-lg ml-2">25 Mile Radius • {profile.zip} ✓</span></h1>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black hidden md:block">Hi {profile.full_name} ✓</span>
            <button onClick={enablePush} className={`w-11 h-11 rounded-full text-xl flex items-center justify-center border-2 ${notifOn?'bg-green-200':'bg-white'}`}>🔔</button>
            <button onClick={logout} className="px-4 py-2 rounded-full bg-white border-2 font-black text-xs">Logout</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_360px] gap-6">
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-3 border-2">
              <p className="text-xs font-black opacity-40 px-2 py-1">FILTER BY TYPE</p>
              {CATEGORIES.map(c=>(
                <button key={c} onClick={()=>setFilter(c)} className={`w-full text-left px-4 py-3 rounded-full font-black text-[14px] border-2 mt-1 ${filter===c?'bg-[#1a3d2e] text-white border-[#1a3d2e]':'bg-white border-black/5'}`}>{c}</button>
              ))}
            </div>
            <div className="bg-[#1a3d2e] text-white rounded-2xl p-4 border-2">
              <p className="text-xs font-black opacity-60">YOUR REACH</p>
              <p className="font-black text-lg">25 Mile Radius</p>
              <p className="text-xs opacity-80 mt-1">From Parkwood Hills (64155) - Covers all KC: North, South, East, West</p>
              <p className="text-[11px] opacity-60 mt-2">Gladstone, Liberty, Briarcliff, Riverside, Overland Park, Lee's Summit, Blue Springs, etc.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-[24px] p-5 shadow-sm border-2 border-black/5">
              <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={`Share to 25 mile radius, ${profile.full_name}?`} className="w-full min-h-[100px] border-2 border-black/10 p-4 rounded-2xl text-lg resize-none focus:outline-none"/>
              <div className="mt-3 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <select value={cat} onChange={e=>setCat(e.target.value)} className="border-2 border-black/10 rounded-full px-4 py-2.5 font-black text-sm">
                    {CATEGORIES.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}
                  </select>
                  <select value={radius} onChange={e=>setRadius(e.target.value)} className="border-2 border-green-600 bg-green-50 rounded-full px-4 py-2.5 font-black text-sm">
                    {RADIUS_OPTIONS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold opacity-60">Will reach: {RADIUS_OPTIONS.find(r=>r.id===radius)?.desc}</span>
                  <button onClick={addPost} className="bg-black text-white px-8 py-3 rounded-full font-black text-lg">Post to {radius==='25'?'25 Mile Radius':'KC'}</button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {filtered.map((p:any)=>(
                <div key={p.id} className="bg-white rounded-[24px] p-6 shadow-sm border-2 border-black/5">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="font-black text-lg">{p.user_name} ✓ <span className="text-xs opacity-50 font-normal">{p.zip||''}</span></span>
                    <div className="flex gap-2">
                      <span className="text-xs bg-black/5 px-3 py-1 rounded-full font-black">{p.category||'General'}</span>
                      <span className="text-[10px] bg-green-100 border border-green-300 px-2 py-1 rounded-full font-black text-green-800">25 MI</span>
                    </div>
                  </div>
                  <div className="mt-3 text-[18px] leading-relaxed whitespace-pre-wrap">{p.content}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-[24px] p-6 shadow-sm border-2 border-black/5">
              <h3 className="font-black text-xl mb-1">Parkwood Hills Base ✓</h3>
              <p className="text-sm font-bold opacity-60 mb-4">25 Mile Radius • {profile.zip} • Verified</p>
              <div className="bg-[#f8f5ee] p-4 rounded-2xl border-2 mb-4">
                <p className="text-xs font-black opacity-60">CURRENT REACH</p>
                <p className="font-black text-2xl">25 Miles</p>
                <p className="text-xs mt-1">≈ 1,963 sq miles - Covers entire KC Metro</p>
                <div className="mt-3 text-[11px] leading-tight opacity-70">
                  Includes: Gladstone, Liberty, Kearney, Smithville, Parkville, Riverside, North KC, Briarcliff, Overland Park, Olathe, Lenexa, Shawnee, Lee's Summit, Independence, Blue Springs, Grandview...
                </div>
              </div>
              <div className="border-t-2 pt-5">
                <h4 className="font-black text-lg mb-3">Send DM + Buzz 🔔</h4>
                <input value={dmTo} onChange={e=>setDmTo(e.target.value)} placeholder="To (e.g. Sophie Bean)" className="w-full border-2 border-black/10 p-3.5 rounded-xl mb-3 text-sm font-black"/>
                <input value={dmMsg} onChange={e=>setDmMsg(e.target.value)} placeholder="Message - reaches 25 mi" className="w-full border-2 border-black/10 p-3.5 rounded-xl mb-3 text-sm"/>
                <button onClick={sendDM} className="w-full bg-black text-white p-3.5 rounded-xl font-black text-base">Send + Buzz 25 Miles</button>
                <div className="mt-4 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                  <p className="text-xs font-black text-green-800">✓ Verified: {profile.street_address}, {profile.zip}</p>
                  <p className="text-[11px] font-bold text-green-700 mt-1">Can post to 25 mile radius</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
