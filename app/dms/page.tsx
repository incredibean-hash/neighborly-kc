'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

function getSupabase(){
  if(typeof window==='undefined') return null;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return null;
  return createClient(url,key);
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
  const blob=await new Promise<Blob>(res=>canvas.toBlob((b)=>res(b as Blob),'image/jpeg',0.7));
  return new File([blob], 'photo.jpg', {type:'image/jpeg'});
}

export default function Page(){
  const router=useRouter();
  const containerRef=useRef<HTMLDivElement>(null);
  const [supabase,setSupabase]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [showVerify,setShowVerify]=useState(false);
  const [showDM,setShowDM]=useState<any>(null);
  const [dmText,setDmText]=useState('');
  const [name,setName]=useState('');
  const [addr,setAddr]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [mailFile,setMailFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [touchStart,setTouchStart]=useState(0);

  // SWIPE: Posts -> DMs
  useEffect(()=>{
    const el=containerRef.current;
    if(!el) return;
    const onStart=(e:TouchEvent)=>setTouchStart(e.touches[0].clientX);
    const onEnd=(e:TouchEvent)=>{
      const diff=touchStart - e.changedTouches[0].clientX;
      if(diff>100) router.push('/dms'); // swipe left
    };
    el.addEventListener('touchstart', onStart);
    el.addEventListener('touchend', onEnd);
    return()=>{ el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); }
  },[touchStart]);

  useEffect(()=>{
    setMounted(true);
    const sb=getSupabase(); setSupabase(sb);
    const s=localStorage.getItem('nkc_profile')||localStorage.getItem('nkc_profile_tiered_40');
    if(s){
      try{
        const p=JSON.parse(s);
        if(!p.user_id) p.user_id=crypto.randomUUID();
        setProfile(p); if(p.street_address) setAddr(p.street_address);
        localStorage.setItem('nkc_profile', JSON.stringify(p));
      }catch{}
    }
  },[]);

  useEffect(()=>{(async()=>{
    if(!supabase) return;
    const {data:p}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100);
    if(p) setPosts(p);
  })()},[supabase]);

  const isVerified=profile?.is_verified||profile?.verified||false;
  if(!mounted) return <div className="min-h-screen bg-[#0a0a0a] text-white p-8">Loading...</div>;

  return(
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] pb-24 touch-pan-y">
      <header className="bg-[#111] border-b border-[#2a2a2a] sticky top-0 z-30 px-4 py-3 grid grid-cols-3 items-center max-w-[600px] mx-auto w-full">
        <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-black text-sm">NK</div>
        <h1 className="font-black text-center">Neighborly KC</h1>
        <div className="flex justify-end text-xs truncate">{profile?<span>{profile.full_name}{isVerified?' ✅':''}</span>:<button onClick={()=>setShowJoin(true)} className="bg-white text-black px-3 py-1.5 rounded-full font-bold">Join</button>}</div>
      </header>

      <div className="max-w-[600px] mx-auto p-4 space-y-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="What's up?" className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-3 min-h-[80px] text-sm text-white outline-none" />
          <input id="file-input" type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs mt-2" />
          <div className="flex justify-end mt-2">
            <button disabled={uploading} onClick={async()=>{
              if(!profile){setShowJoin(true); return;}
              if(!supabase) return;
              setUploading(true);
              try{
                let image_url=null;
                if(file){
                  const comp=await compressImage(file);
                  const safePath=`post_${Date.now()}.jpg`;
                  const {error}=await supabase.storage.from('post-images').upload(safePath, comp, {cacheControl:'3600', upsert:false});
                  if(error) throw error;
                  const {data}=supabase.storage.from('post-images').getPublicUrl(safePath);
                  image_url=data.publicUrl;
                }
                const {data,error}=await supabase.from('posts').insert({ body: body.trim(), author_name: profile.full_name, image_url }).select().single();
                if(error) throw error;
                setPosts([data,...posts]); setBody(''); setFile(null);
                (document.getElementById('file-input') as any).value='';
              }catch(e:any){alert('Could not save: '+e.message);} finally{setUploading(false);}
            }} className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold">Post</button>
          </div>
        </div>
        {posts.map((p:any)=>(
          <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
            <p className="text-xs font-bold opacity-70">{p.author_name} {isVerified && p.author_name===profile?.full_name?' ✓':''}</p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{p.body}</p>
            {p.image_url&&<img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[400px] w-full object-cover border border-[#333]" />}
            <button onClick={()=>setShowDM(p)} className="mt-3 text-xs bg-[#2a2a2a] px-3 py-1.5 rounded-full">💬 DM {p.author_name?.split(' ')[0]}</button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur border-t border-[#2a2a2a] p-3 flex gap-2 z-40 max-w-[600px] mx-auto">
        <a href="/dms" className="flex-1 bg-[#2a2a2a] text-white py-3 rounded-full font-bold text-sm text-center">DMs</a>
        <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} className="flex-1 bg-white text-black py-3 rounded-full font-bold text-sm">Posts</button>
      </div>

      {showDM&&(
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#e5e5e5] border border-[#999] rounded-2xl w-full max-w-sm p-6 text-black">
            <div className="flex justify-between items-center mb-3"><h2 className="font-black">DM {showDM.author_name}</h2><button onClick={()=>setShowDM(null)} className="w-8 h-8 rounded-full bg-black text-white">✕</button></div>
            <textarea value={dmText} onChange={e=>setDmText(e.target.value)} placeholder="Message..." className="w-full bg-white border border-[#999] rounded-xl p-3 min-h-[100px] text-sm text-black outline-none" />
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowDM(null)} className="flex-1 bg-[#2a2a2a] text-white py-3 rounded-full text-sm">Cancel</button>
              <button onClick={async()=>{
                if(!dmText.trim()||!supabase||!profile) return;
                await supabase.from('dms').insert({from_user:profile.full_name,to_user:showDM.author_name,message:dmText,body:dmText});
                setDmText(''); setShowDM(null);
              }} className="flex-1 bg-black text-white py-3 rounded-full text-sm font-bold">Send DM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
