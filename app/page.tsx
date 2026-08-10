
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

async function compressImage(file: File): Promise<File> {
  const img=document.createElement('img');
  const canvas=document.createElement('canvas');
  const dataUrl=await new Promise<string>((r)=>{const rd=new FileReader(); rd.onload=()=>r(rd.result as string); rd.readAsDataURL(file);});
  await new Promise<void>((res)=>{img.onload=()=>res(); img.src=dataUrl;});
  const max=1200; let {width,height}=img;
  if(width>max||height>max){ if(width>height){height=height*max/width;width=max;} else{width=width*max/height;height=max;} }
  canvas.width=width; canvas.height=height;
  canvas.getContext('2d')!.drawImage(img,0,0,width,height);
  const blob=await new Promise<Blob>((res)=>canvas.toBlob((b)=>res(b as Blob),'image/jpeg',0.7));
  return new File([blob], file.name.replace(/\.\w+$/,'.jpg'), {type:'image/jpeg'});
}

export default function Page(){
  const [supabase,setSupabase]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [mounted,setMounted]=useState(false);

  useEffect(()=>{
    setMounted(true);
    setSupabase(getSupabase());
    const s=localStorage.getItem('nkc_profile')||localStorage.getItem('nkc_profile_tiered_40');
    if(s){try{setProfile(JSON.parse(s))}catch{}}
  },[]);

  useEffect(()=>{(async()=>{
    if(!supabase) return;
    const {data:p}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(50);
    if(p) setPosts(p);
  })()},[supabase]);

  if(!mounted) return <div className="p-8">Loading...</div>;

  return(
    <div className="min-h-screen bg-[#f8f5ee]">
      <header className="bg-white border-b p-4 flex justify-between"><h1 className="font-black">Neighborly KC</h1>{profile?<span className="text-xs">{profile.full_name}</span>:<button onClick={()=>setShowJoin(true)} className="bg-black text-white px-4 py-2 rounded-full text-sm">Join</button>}</header>
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="bg-white rounded-2xl p-4 border">
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?"What's up?":"Join to post..."} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[80px] text-sm outline-none" />
          <div className="flex items-center gap-2 mt-3">
            <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs" />
            {file&&<span className="text-xs opacity-60">{(file.size/1024).toFixed(0)}KB</span>}
          </div>
          <div className="flex justify-end mt-2"><button disabled={uploading} onClick={async()=>{
            if(!profile) return setShowJoin(true);
            if(!supabase) return alert('Add env vars');
            if(!body.trim()&&!file) return;
            if(file&&file.size>3*1024*1024) return alert('Max 3MB');
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
              const {data,error}=await supabase.from('posts').insert({body,author_name:profile.full_name,image_url}).select().single();
              if(error) throw error;
              setPosts([data,...posts]); setBody(''); setFile(null);
              const el=document.getElementById('file-input') as HTMLInputElement; if(el) el.value='';
            }catch(e:any){alert('Could not save: '+(e.message||e));} finally{setUploading(false);}
          }} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50">{uploading?'Uploading...':'Post'}</button></div>
        </div>
        {posts.map((p:any)=><div key={p.id} className="bg-white p-4 rounded-xl border"><p className="text-xs opacity-60">{p.author_name}</p><p className="mt-1 whitespace-pre-wrap">{p.body}</p>{p.image_url&&<img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[400px] w-full object-cover border" />}<p className="text-[10px] opacity-40 mt-2">{new Date(p.created_at).toLocaleString()}</p></div>)}
      </div>
      {showJoin&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-2xl w-full max-w-sm"><h2 className="font-black text-xl">Join</h2><input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 mt-4"/><div className="flex gap-2 mt-4"><button onClick={()=>setShowJoin(false)} className="flex-1 bg-gray-100 py-3 rounded-full">Cancel</button><button onClick={()=>{if(!name.trim()) return alert('Enter name'); const pr={full_name:name.trim()}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false); location.reload();}} className="flex-1 bg-black text-white py-3 rounded-full">Join</button></div></div></div>}
    </div>
  );
}
