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
  if(a.length<10) return false;
  if(!/\d/.test(a)) return false;
  if(/test|fake|asdf/i.test(a)) return false;
  if(!/(st|street|ave|avenue|dr|drive|ln|lane|blvd|court|ct|pl|place|rd|road)\b/i.test(a)) return false;
  return true;
}
function containsObscene(text:string){
  const banned=['porn','xxx','nude','sex','obscene','nsfw','dick','pussy','fuck']; // add more
  const t=text.toLowerCase();
  return banned.some(w=>t.includes(w));
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
  const [name,setName]=useState('');
  const [addr,setAddr]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [mailFile,setMailFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editBody,setEditBody]=useState('');
  const [isMobile,setIsMobile]=useState(false);
  const [installPrompt,setInstallPrompt]=useState<any>(null);
  const [showInstall,setShowInstall]=useState(false);
  const [hoods,setHoods]=useState<any[]>([]);

  useEffect(()=>{
    setMounted(true);
    setSupabase(getSupabase());
    setIsMobile(/Android|iPhone|iPad/i.test(navigator.userAgent)||window.innerWidth<768);
    const s=localStorage.getItem('nkc_profile')||localStorage.getItem('nkc_profile_tiered_40');
    if(s){try{setProfile(JSON.parse(s))}catch{}}
    window.addEventListener('beforeinstallprompt',(e:any)=>{e.preventDefault(); setInstallPrompt(e); setShowInstall(true);});
  },[]);

  useEffect(()=>{(async()=>{
    if(!supabase) return;
    const {data:h}=await supabase.from('neighborhoods').select('*').limit(20);
    if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(100);
    if(p) setPosts(p);
  })()},[supabase]);

  const cur=hoods[0]||{name:'Parkwood Hills',zip:'64155',id:null,member_count:247};
  const isJason = profile?.full_name?.toLowerCase().includes('jason bean');
  const isFounder = profile?.is_founder || (profile?.founder_number && profile.founder_number<=50);

  const handlePost=async()=>{
    if(!profile){setShowJoin(true); return;}
    if(!supabase){alert('Add Supabase keys'); return;}
    if(!body.trim()&&!file) return;
    if(containsObscene(body)){alert('No obscene content allowed'); return;}
    if(file&&file.size>3*1024*1024){alert('Max 3MB'); return;}
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

  const handleEdit=async(id:string)=>{
    if(!supabase) return;
    if(containsObscene(editBody)){alert('No obscene content'); return;}
    const {data,error}=await supabase.from('posts').update({body:editBody}).eq('id',id).select().single();
    if(error) return alert(error.message);
    setPosts(posts.map(p=>p.id===id?{...p,body:editBody}:p)); setEditingId(null);
  };

  const handleDelete=async(id:string,image_url?:string)=>{
    if(!supabase) return;
    const post=posts.find(p=>p.id===id);
    const isOwner=profile&&post&&post.author_name===profile.full_name;
    if(!isOwner&&!isJason){alert('You can only delete your own'); return;}
    if(!confirm('Delete post?')) return;
    if(image_url){ const path=image_url.split('/post-images/')[1]; if(path) await supabase.storage.from('post-images').remove([path]); }
    await supabase.from('posts').delete().eq('id',id);
    setPosts(posts.filter(p=>p.id!==id));
  };

  const handleMailVerify=async()=>{
    if(!supabase) return alert('DB not configured');
    if(!isMobile){alert('Mail verification must be done on mobile'); return;}
    if(!mailFile){alert('Upload mail photo with address'); return;}
    if(!isValidKCAddress(addr)){alert('Enter valid KC address'); return;}
    if(mailFile.size>3*1024*1024){alert('Max 3MB'); return;}
    setUploading(true);
    try{
      const path=`mail-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const {error}=await supabase.storage.from('mail-verifications').upload(path,mailFile);
      if(error) throw error;
      const {data}=supabase.storage.from('mail-verifications').getPublicUrl(path);
      alert('Mail verification uploaded — admin will verify. URL: '+data.publicUrl);
      setMailFile(null);
    }catch(e:any){alert('Mail upload failed: '+e.message);} finally{setUploading(false);}
  };

  if(!mounted) return <div className="min-h-screen bg-[#0a0a0a] text-white p-8">Loading...</div>;

  return(
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5]">
      <header className="bg-[#111] border-b border-[#2a2a2a] sticky top-0 z-20 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-black">NK</div><span className="font-black">Neighborly KC {isFounder?<span className="ml-2 bg-white text-black text-[10px] px-2 py-0.5 rounded-full">👑 FOUNDER</span>:null}</span></div>
        <div className="flex gap-2">{showInstall?<button onClick={()=>installPrompt?.prompt()} className="bg-white text-black px-3 py-1.5 rounded-full text-xs font-bold">Install Windows App</button>:null}{profile?<span className="text-xs">{profile.full_name} {isJason?' (Admin)':''}</span>:<button onClick={()=>setShowJoin(true)} className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold">Join</button>}</div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur.name}?`:'Join to post...'} className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-3 min-h-[80px] text-sm text-white outline-none" />
          <div className="flex items-center gap-2 mt-3">
            <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs" />
            {file&&<span className="text-xs opacity-50">{(file.size/1024).toFixed(0)}KB</span>}
          </div>
          <p className="text-[10px] opacity-30 mt-1">Pictures allowed, no obscene content. Max 3MB, jpg/png/webp.</p>
          <div className="flex justify-end mt-3"><button disabled={uploading} onClick={handlePost} className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50">{uploading?'Uploading...':'Post'}</button></div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <h3 className="font-bold text-sm mb-2">Mail Verification (mobile only)</h3>
          <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="304 NE 115th St, 64155" autoComplete="off" name="nkc-no-autofill-addr" className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-2 text-sm mb-2 text-white" />
          <input type="file" accept="image/*" onChange={e=>setMailFile(e.target.files?.[0]||null)} className="text-xs" />
          <div className="flex justify-end mt-2"><button onClick={handleMailVerify} disabled={uploading||!isMobile} className="bg-[#2a2a2a] text-white px-4 py-2 rounded-full text-xs font-bold disabled:opacity-30">{isMobile?'Upload Mail Photo':'Open on phone to verify'}</button></div>
          <button onClick={()=>{localStorage.clear(); setAddr(''); setProfile(null); alert('Address removed from autofill/device');}} className="text-[10px] underline opacity-40 mt-2">Remove my address from autofill</button>
        </div>

        {posts.map((p:any)=>{
          const isOwner=profile&&p.author_name===profile.full_name;
          const canDelete=isOwner||isJason;
          const canEdit=isOwner;
          return(
            <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
              <div className="flex justify-between"><p className="text-xs opacity-50">{p.author_name} {p.is_founder?'👑':''}</p><div className="flex gap-2">{canEdit&&<button onClick={()=>{setEditingId(p.id); setEditBody(p.body);}} className="text-xs opacity-40">✏️ Edit</button>}{canDelete&&<button onClick={()=>handleDelete(p.id,p.image_url)} className="text-xs opacity-40 text-red-400">🗑️ Delete</button>}</div></div>
              {editingId===p.id?(
                <div className="mt-2"><textarea value={editBody} onChange={e=>setEditBody(e.target.value)} className="w-full bg-black border border-[#333] rounded-xl p-2 text-sm text-white" /><div className="flex gap-2 mt-2"><button onClick={()=>handleEdit(p.id)} className="bg-white text-black px-3 py-1 rounded-full text-xs">Save</button><button onClick={()=>setEditingId(null)} className="bg-[#2a2a2a] px-3 py-1 rounded-full text-xs">Cancel</button></div></div>
              ):(
                <p className="mt-2 text-sm whitespace-pre-wrap">{p.body}</p>
              )}
              {p.image_url&&<img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[400px] w-full object-cover border border-[#333]" />}
            </div>
          );
        })}
      </div>

      {showJoin?(
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-black text-xl">Join {cur.name}</h2>
            {cur.member_count<50?<div className="bg-white text-black text-xs p-2 rounded-xl mt-2 font-bold">First 50 get FOUNDER badge — {50-cur.member_count} left</div>:null}
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name (Jason Bean for admin)" autoComplete="off" className="w-full bg-black border border-[#333] rounded-xl px-3 py-3 mt-4 text-sm text-white" />
            <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Address - no autofill" autoComplete="off" name="no-autofill-join" className="w-full bg-black border border-[#333] rounded-xl px-3 py-3 mt-2 text-sm text-white" />
            <div className="flex gap-2 mt-4"><button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#2a2a2a] py-3 rounded-full">Cancel</button><button onClick={()=>{
              if(!name.trim()) return alert('Name required');
              if(!isValidKCAddress(addr)) return alert('Enter valid KC address');
              const num=cur.member_count+1;
              const pr={full_name:name.trim(),street_address:addr.trim(),is_founder:num<=50,founder_number:num<=50?num:null};
              localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false); location.reload();
            }} className="flex-1 bg-white text-black py-3 rounded-full font-bold">Join</button></div>
          </div>
        </div>
      ):null}
    </div>
  );
}
