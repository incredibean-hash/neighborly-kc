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
        </div>
      </header>

      {/* VERIFY BUTTON UNDER HEADER - REMOVES WHEN VERIFIED */}
      {!isVerified && profile && (
        <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-2 flex justify-center">
          <button onClick={()=>setShowVerify(true)} className="bg-white text-black px-5 py-1.5 rounded-full text-xs font-black">Verify — Upload Mail Photo</button>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur.name}?`:'Join to post...'} className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-3 min-h-[80px] text-sm text-white outline-none placeholder:text-[#555]" />
          <div className="flex items-center gap-2 mt-3">
            <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs text-[#888]" />
          </div>
          <div className="flex justify-end mt-2"><button disabled={uploading} onClick={handlePost} className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50">{uploading?'Uploading...':'Post'}</button></div>
        </div>

        {posts.map((p:any)=>{
          const isOwner=profile&&p.author_name===profile.full_name;
          const canDelete=isOwner||isJason;
          return(
            <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
              <div className="flex justify-between"><p className="text-xs opacity-50">{p.author_name}{p.author_name?.toLowerCase().includes('jason bean')?' 👑':''}</p><div className="flex gap-2">{isOwner&&<button onClick={()=>{setEditingId(p.id); setEditBody(p.body);}} className="text-xs opacity-40">Edit</button>}{canDelete&&<button onClick={async()=>{if(!confirm('Delete?')) return; if(!supabase) return; await supabase.from('posts').delete().eq('id',p.id); setPosts(posts.filter(x=>x.id!==p.id));}} className="text-xs text-red-400 opacity-60">Delete</button>}</div></div>
              {editingId===p.id?(
                <div className="mt-2"><textarea value={editBody} onChange={e=>setEditBody(e.target.value)} className="w-full bg-black border border-[#333] rounded-xl p-2 text-sm text-white" /><div className="flex gap-2 mt-2"><button onClick={async()=>{if(!supabase) return; await supabase.from('posts').update({body:editBody}).eq('id',p.id); setPosts(posts.map(x=>x.id===p.id?{...x,body:editBody}:x)); setEditingId(null);}} className="bg-white text-black px-3 py-1 rounded-full text-xs">Save</button><button onClick={()=>setEditingId(null)} className="bg-[#2a2a2a] px-3 py-1 rounded-full text-xs">Cancel</button></div></div>
              ):<p className="mt-2 text-sm whitespace-pre-wrap">{p.body}</p>}
              {p.image_url&&<img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[400px] w-full object-cover border border-[#333]" />}
              <div className="mt-3 flex gap-3">
                <a href={profile?`/dms?to=${encodeURIComponent(p.author_name)}`:'/'} onClick={async(e)=>{
                  if(!profile){e.preventDefault(); setShowJoin(true); return;}
                  if(!supabase) return;
                  const other=p.author_name;
                  if(other===profile.full_name) return;
                  try{ await supabase.from('dms').insert({from_user:profile.full_name,to_user:other,message:`Hi ${other} — about your post: "${p.body.slice(0,50)}"`,body:`DM`}); }catch{}
                }} className="text-xs bg-[#2a2a2a] px-3 py-1 rounded-full">💬 DM {p.author_name?.split(' ')[0]}</a>
              </div>
            </div>
          );
        })}
      </div>

      {/* STICKY DM + POST BUTTONS ON BOTTOM AFTER VERIFICATION */}
      {profile && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-[#2a2a2a] p-3 flex gap-2 z-40">
          <a href="/dms" className="flex-1 bg-[#2a2a2a] text-white py-3 rounded-full font-bold text-sm text-center">DMs</a>
          <button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} className="flex-1 bg-white text-black py-3 rounded-full font-bold text-sm">Post</button>
        </div>
      )}

      {/* MAIL VERIFICATION POPUP */}
      {showVerify&&(
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-3"><h2 className="font-black text-lg">Verify Address</h2><button onClick={()=>setShowVerify(false)} className="w-8 h-8 rounded-full bg-[#2a2a2a]">✕</button></div>
            <p className="text-xs opacity-60 mb-3">Upload a photo of mail with your address. Works on desktop and mobile. No obscene content.</p>
            <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="304 NE 115th St, 64155" autoComplete="off" data-lpignore="true" name="nkc_verify_no_autofill" className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-3 text-sm text-white mb-3 outline-none" />
            <input type="file" accept="image/*" onChange={e=>setMailFile(e.target.files?.[0]||null)} className="text-xs w-full mb-3" />
            <div className="flex gap-2">
              <button onClick={()=>setShowVerify(false)} className="flex-1 bg-[#2a2a2a] py-3 rounded-full text-sm font-bold">Cancel</button>
              <button disabled={uploading} onClick={async()=>{
                if(!isValidKCAddress(addr)){alert('Enter valid address'); return;}
                if(!mailFile){alert('Upload mail photo'); return;}
                if(!supabase) return;
                setUploading(true);
                try{
                  const path=`mail-${Date.now()}.jpg`;
                  const {error}=await supabase.storage.from('mail-verifications').upload(path,mailFile);
                  if(error) throw error;
                  const {data}=supabase.storage.from('mail-verifications').getPublicUrl(path);
                  const updated={...profile,is_verified:true,verified_at:new Date().toISOString(),mail_url:data.publicUrl};
                  localStorage.setItem('nkc_profile',JSON.stringify(updated));
                  setProfile(updated); setShowVerify(false); alert('Verified! ✅');
                }catch(e:any){alert(e.message);} finally{setUploading(false);}
              }} className="flex-1 bg-white text-black py-3 rounded-full text-sm font-bold disabled:opacity-50">{uploading?'Uploading...':'Verify'}</button>
            </div>
          </div>
        </div>
      )}

      {showJoin&&(
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-black text-xl">Join {cur.name}</h2>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" autoComplete="off" data-lpignore="true" name="nkc_join_name_blank" className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-3 mt-4 text-sm text-white outline-none" />
            <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Address" autoComplete="off" data-lpignore="true" name="nkc_join_addr_blank" onFocus={e=>{if(e.target.value){e.target.value=''; setAddr('');}}} className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-3 mt-2 text-sm text-white outline-none" />
            <div className="flex gap-2 mt-4"><button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#2a2a2a] py-3 rounded-full text-sm">Cancel</button><button onClick={()=>{
              if(!name.trim()) return alert('Name required');
              if(!isValidKCAddress(addr)) return alert('Valid address required');
              const pr={full_name:name.trim(),street_address:addr.trim(),is_founder:(cur.member_count||0)<50,founder_number:(cur.member_count||0)<50?(cur.member_count||0)+1:null};
              localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false); location.reload();
            }} className="flex-1 bg-white text-black py-3 rounded-full font-bold text-sm">Join</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
