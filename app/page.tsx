'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabase(){
  if(typeof window==='undefined') return null;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return null;
  return createClient(url,key);
}

function isValidKCAddress(a:string){
  if(!a) return false;
  if(a.length<8) return false;
  if(!/\d/.test(a)) return false;
  return true;
}
function containsObscene(t:string){
  const banned=['porn','xxx','nude','sex video','obscene'];
  return banned.some(w=>t.toLowerCase().includes(w));
}
async function compressImage(file: File){
  const img=document.createElement('img');
  const canvas=document.createElement('canvas');
  const dataUrl=await new Promise<string>(r=>{const rd=new FileReader(); rd.onload=()=>r(rd.result as string); rd.readAsDataURL(file);});
  await new Promise<void>(res=>{img.onload=()=>res(); img.src=dataUrl;});
  let {width,height}=img; const max=1200;
  if(width>max||height>max){ if(width>height){height=height*max/width;width=max;}else{width=width*max/height;height=max;} }
  canvas.width=width; canvas.height=height;
  canvas.getContext('2d')!.drawImage(img,0,0,width,height);
  const blob=await new Promise<Blob>(res=>canvas.toBlob(b=>res(b as Blob),'image/jpeg',0.7));
  return new File([blob], file.name.replace(/\.\w+$/,'.jpg'),{type:'image/jpeg'});
}

export default function Page(){
  const [supabase,setSupabase]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [showVerify,setShowVerify]=useState(false);
  const [name,setName]=useState('');
  const [addr,setAddr]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [mailFile,setMailFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editBody,setEditBody]=useState('');
  const [hoods,setHoods]=useState<any[]>([]);

  useEffect(()=>{
    setMounted(true);
    setSupabase(getSupabase());
    const s=localStorage.getItem('nkc_profile')||localStorage.getItem('nkc_profile_tiered_40');
    if(s){try{setProfile(JSON.parse(s))}catch{}}
    document.title='Neighborly KC';
  },[]);

  useEffect(()=>{(async()=>{
    if(!supabase) return;
    const {data:h}=await supabase.from('neighborhoods').select('*').limit(20);
    if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100);
    if(p) setPosts(p);
  })()},[supabase]);

  const cur=hoods[0]||{name:'Parkwood Hills',zip:'64155',id:null,member_count:247};
  const isJason=profile?.full_name?.toLowerCase().includes('jason bean');
  const isVerified=profile?.is_verified||profile?.verified||false;

  const handlePost=async()=>{
    if(!profile){setShowJoin(true); return;}
    if(!supabase) return;
    if(!body.trim()&&!file) return;
    if(containsObscene(body)){alert('No obscene content allowed'); return;}
    setUploading(true);
    try{
      let image_url=null;
      if(file){
        const comp=await compressImage(file);
        const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const {error}=await supabase.storage.from('post-images').upload(path,comp);
        if(error) throw error;
        const {data}=supabase.storage.from('post-images').getPublicUrl(path);
        image_url=data.publicUrl;
      }
      const {data,error}=await supabase.from('posts').insert({body,author_name:profile.full_name,neighborhood_id:cur.id,image_url}).select().single();
      if(error) throw error;
      setPosts([data,...posts]); setBody(''); setFile(null);
    }catch(e:any){alert(e.message);} finally{setUploading(false);}
  };

  if(!mounted) return <div className="min-h-screen bg-[#0a0a0a] text-white p-8">Loading Neighborly KC...</div>;

  return(
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] pb-20">
      {/* CENTERED HEADER */}
      <header className="bg-[#111] border-b border-[#2a2a2a] sticky top-0 z-30 px-4 py-3 grid grid-cols-3 items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-black text-sm">NK</div>
          <a href="/dms" className="text-xs opacity-60 hidden sm:block">DMs</a>
        </div>
        <h1 className="font-black tracking-tight text-center text-[15px]">Neighborly KC</h1>
        <div className="flex justify-end">
          {profile? <span className="text-xs opacity-60 truncate">{profile.full_name}{isJason?' 👑':''}{isVerified?' ✅':''}</span> : <button onClick={()=>setShowJoin(true)} className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold">Join</button>}
        </
