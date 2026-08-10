'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];

async function compressImage(file: File): Promise<File> {
  const img = document.createElement('img');
  const canvas = document.createElement('canvas');
  const dataUrl = await new Promise<string>((r)=>{ const reader = new FileReader(); reader.onload=()=>r(reader.result as string); reader.readAsDataURL(file); });
  await new Promise<void>((res)=>{ img.onload=()=>res(); img.src=dataUrl; });
  const max=1200; let {width,height}=img;
  if(width>max||height>max){ if(width>height){ height=height*max/width; width=max; } else { width=width*max/height; height=max; } }
  canvas.width=width; canvas.height=height; canvas.getContext('2d')!.drawImage(img,0,0,width,height);
  const blob = await new Promise<Blob>((res)=>canvas.toBlob((b)=>res(b as Blob), 'image/jpeg', 0.7));
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {type:'image/jpeg'});
}

export default function Page(){
  const [hoods,setHoods]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [comments,setComments]=useState<Record<string,any[]>>({});
  const [likes,setLikes]=useState<Record<string,any[]>>({});
  const [cLikes,setCLikes]=useState<Record<string,any[]>>({});
  const [openComments,setOpenComments]=useState<Record<string,boolean>>({});
  const [commentText,setCommentText]=useState<Record<string,string>>({});
  const [hood,setHood]=useState('parkwood-hills');
  const [cat,setCat]=useState('All');
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [addr,setAddr]=useState('304 NE 115TH ST');
  const [zip,setZip]=useState('64155');
  const [file,setFile]=useState<File|null>(null);
  const [mailFile,setMailFile]=useState<File|null>(null);
  const [aiVerifying,setAiVerifying]=useState(false);
  const [aiParsedAddress,setAiParsedAddress]=useState<any>(null);
  const [aiVerified,setAiVerified]=useState(false);
  const [verifyError,setVerifyError]=useState<string|null>(null);
  const [showBluetoothRequest,setShowBluetoothRequest]=useState<{owner:string, address:string}|null>(null);
  const [uploading,setUploading]=useState(false);

  const loadAll = async (postIds:string[]) => {
    if(!postIds.length) return;
    const {data:com}=await supabase.from('comments').select('*').in('post_id', postIds).order('created_at',{ascending:false});
    if(com){
      const g: Record<string,any[]> = {};
      com.forEach((c:any)=>{ if(!g[c.post_id]) g[c.post_id]=[]; g[c.post_id].push(c); });
      setComments(g);
      const cIds=com.map((c:any)=>c.id);
      if(cIds.length){
        const {data:cl}=await supabase.from('likes').select('*').in('comment_id', cIds);
        if(cl){ const cg: Record<string,any[]> = {}; cl.forEach((l:any)=>{ if(!cg[l.comment_id]) cg[l.comment_id]=[]; cg[l.comment_id].push(l); }); setCLikes(cg); }
      }
    }
    const {data:lk}=await supabase.from('likes').select('*').in('post_id', postIds).is('comment_id', null);
    if(lk){ const lg: Record<string,any[]> = {}; lk.forEach((l:any)=>{ if(!lg[l.post_id]) lg[l.post_id]=[]; lg[l.post_id].push(l); }); setLikes(lg); }
  };

  useEffect(()=>{ (async()=>{
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false});
    if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(50);
    if(p){ setPosts(p); loadAll(p.map((x:any)=>x.id)); }
    const s=typeof window!=='undefined'? localStorage.getItem('nkc_profile_tiered_40')||localStorage.getItem('nkc_profile'):null;
    if(s) try{ setProfile(JSON.parse(s)); }catch{}
  })() },[]);

  const cur = hoods.find((x:any)=>x.slug===hood) || hoods[0] || {name:'Parkwood Hills', zip:'64155', id: null, slug:'parkwood-hills', member_count: 247};
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);
  const isAdmin = profile?.full_name?.toLowerCase().includes('jason') || profile?.is_founder;

  const handleAiVerify = async()=>{
    if(!mailFile){ setVerifyError('Upload mail photo first'); return; }
    setAiVerifying(true); setVerifyError(null); setAiParsedAddress(null); setAiVerified(false); setShowBluetoothRequest(null);
    try{
      const form = new FormData(); form.append('file', mailFile);
      const res = await fetch('/api/verify-mail',{method:'POST', body:form});
      const j = await res.json();
      if(!res.ok) throw new Error(j.error||'OCR failed');
      const fullAddr = j.full_address||j.full||`${j.street} ${j.zip}`;
      setAiParsedAddress({ street: j.street, zip: j.zip, city: j.city||'KANSAS CITY', full: fullAddr, ocr: j.ocr_text });
      try{
        const checkRes = await fetch('/api/check-address',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({street: j.street, zip: j.zip, full: fullAddr, requester: name})});
        const checkJ = await checkRes.json();
        if(checkJ.alreadyVerified){
          await fetch('/api/alert-address',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({street: j.street, zip: j.zip, full: fullAddr, existingOwner: checkJ.owner, requester: name})});
          setVerifyError(`⚠️ Address "${fullAddr}" already verified by ${checkJ.owner}. Owner alerted.`);
          setShowBluetoothRequest({owner: checkJ.owner, address: fullAddr});
          setAiVerifying(false); return;
        }
      }catch(e){ console.error(e); }
      setAiVerified(true); setAddr(j.street); setZip(j.zip||'64155');
    }catch(e:any){ setVerifyError(`❌ ${e.message}`); } finally{ setAiVerifying(false); }
  };

  const handlePost = async () => {
    if(!profile) return setShowJoin(true);
    if(!body.trim() &&!file) return;
    if(file && file.size > 3*1024*1024){ alert('Max 3MB!'); return; }
    setUploading(true);
    try{
      let image_url: string | null = null;
      if(file){
        const compressed=await compressImage(file);
        const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const {error: upErr}=await supabase.storage.from('post-images').upload(path, compressed);
        if(upErr) throw upErr;
        const {data}=supabase.storage.from('post-images').getPublicUrl(path);
        image_url=data.publicUrl;
      }
      const realId = hoods.find((x:any)=>x.slug===hood)?.id || cur?.id;
      const { data, error } = await supabase.from('posts').insert({ body, category: cat==='All'? 'General' : cat, neighborhood_id: realId, image_url }).select().single();
      if(error) throw error;
      setPosts([{...data, profiles:{full_name:profile.full_name}},...posts]);
      setBody(''); setFile(null);
      const el = document.getElementById('file-input') as HTMLInputElement; if(el) el.value='';
    } catch(e:any){ alert('Could not save: '+(e.message||e)); } finally{ setUploading(false); }
  };

  const addComment = async (postId:string) => {
    if(!profile) return setShowJoin(true);
    const text=commentText[postId]?.trim(); if(!text) return;
    const {data, error}=await supabase.from('comments').insert({ post_id: postId, content:text, body:text, author_name:profile.full_name }).select().single();
    if(error) return alert(error.message);
    setComments((prev)=> ({...prev, [postId]: [data,...(prev[postId]||[])]}));
    setCommentText((prev)=>({...prev,[postId]:''}));
  };
  const togglePostLike = async (postId:string) => {
    if(!profile) return setShowJoin(true);
    const list = likes[postId]||[]; const myLike = list.find((l:any)=>l.author_name===profile.full_name);
    if(myLike){ await supabase.from('likes').delete().eq('id', myLike.id); setLikes((prev)=>{ const next={...prev}; next[postId]=prev[postId].filter((x:any)=>x.id!==myLike.id); return next; }); }
    else { const {data}=await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name}).select().single(); if(data){ setLikes((prev)=>{ const next={...prev}; next[postId]=[...(prev[postId]||[]), data]; return next; }); } }
  };
  const toggleCommentLike = async (commentId:string) => {
    if(!profile) return setShowJoin(true);
    const list = cLikes[commentId]||[]; const myLike = list.find((l:any)=>l.author_name===profile.full_name);
    if(myLike){ await supabase.from('likes').delete().eq('id', myLike.id); setCLikes((prev)=>{ const next={...prev}; next[commentId]=prev[commentId].filter((x:any)=>x.id!==myLike.id); return next; }); }
    else { const {data}=await supabase.from('likes').insert({comment_id:commentId, author_name:profile.full_name}).select().single(); if(data){ setCLikes((prev)=>{ const next={...prev}; next[commentId]=[...(prev[commentId]||[]), data]; return next; }); } }
  };
  const deletePost = async (id:string, img:string|null) => { if(!confirm('Delete?')) return; await supabase.from('posts').delete().eq('id', id); if(img){ try{ const p=img.split('/post-images/')[1]; if(p) await supabase.storage.from('post-images').remove([p]); }catch{} } setPosts(posts.filter((p:any)=>p.id!==id)); };
  const deleteComment = async (id:string, postId:string) => { if(!confirm('Delete comment?')) return; await supabase.from('comments').delete().eq('id', id); setComments((prev)=>{ const next={...prev}; next[postId]=(next[postId]||[]).filter((c:any)=>c.id!==id); return next; }); };

  return (
    <div className="min-h-screen bg-[#f8f5ee]">
      <header className="bg-white border-b sticky top-0 z-20 px-4 py-3 flex justify-between items-center">
        <h1 className="font-black text-lg">Neighborly KC {profile?.tier==='40mile'?'🌐40mi':'📍5mi'} {profile?.is_founder?'👑':''}</h1>
        <div className="flex gap-2 items-center">{profile?<><span className="text-xs hidden sm:block">{profile.full_name} - {profile.street_address}</span><Link href="/dms" className="bg-black text-white px-3 py-1 rounded-full text-xs">DMs</Link></>:<button onClick={()=>setShowJoin(true)} className="bg-[#1a3a2f] text-white px-4 py-1.5 rounded-full text-sm font-bold">Join</button>}</div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-6">
        <aside className="bg-white rounded-2xl p-3 h-fit border hidden lg:block"><p className="text-xs font-bold opacity-40 px-3 py-2">FILTER</p>{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${cat===c?'bg-[#1a3a2f] text-white':'hover:bg-black/5'}`}>{c}</button>)}</aside>
        <main className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border">
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur?.name}?`:'Join to post...'} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[80px] text-sm outline-none" />
            <div className="flex items-center gap-2 mt-3"><input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs" />{file && <span className="text-xs opacity-60">{(file.size/1024).toFixed(0)}KB</span>}</div>
            <div className="flex justify-end mt-2"><button disabled={uploading} onClick={handlePost} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50">{uploading?'Uploading...':'Post • '+(profile?.tier==='40mile'?'🌐40mi':'📍5mi')}</button></div>
          </div>
          {filtered.map((p:any)=>{
            const cList=comments[p.id]||[]; const isOpen=openComments[p.id]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_name===profile?.full_name);
            const isOwner = profile && (p.profiles?.full_name===profile.full_name || p.author_name===profile.full_name); const canDelete = isOwner || isAdmin;
            return (
            <div key={p.id} className="bg-white rounded-2xl p-4 border">
              <div className="flex justify-between"><p className="text-xs font-bold opacity-60">{p.profiles?.full_name||p.author_name} · {p.category}</p>{canDelete && <button onClick={()=>deletePost(p.id,p.image_url)} className="text-xs opacity-40 hover:text-red-600">🗑️ Delete</button>}</div>
              <p className="mt-1 whitespace-pre-wrap">{p.body || p.content}</p>
              {p.image_url && <img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[400px] w-full object-cover border" />}
              <p className="text-xs opacity-40 mt-2">{new Date(p.created_at).toLocaleString()}</p>
              <div className="mt-3 pt-3 border-t flex gap-4">
                <button onClick={()=>togglePostLike(p.id)} className={`text-xs font-bold ${liked?'text-red-600':'opacity-60'}`}>{liked?'❤️':'🤍'} {pLikes.length}</button>
                <button onClick={()=>setOpenComments((prev)=>({...prev,[p.id]:!prev[p.id]}))} className="text-xs font-bold opacity-60">💬 {cList.length} {isOpen?'▲':'▼'}</button>
              </div>
              {isOpen && (
                <div className="mt-3 bg-[#f8f5ee] rounded-xl p-3 space-y-2">
                  {cList.map((c:any)=>{ const cl=cLikes[c.id]||[]; const cliked=cl.some((l:any)=>l.author_name===profile?.full_name); const canDelC = (profile && c.author_name===profile.full_name) || isAdmin; return (<div key={c.id} className="text-sm bg-white rounded-lg p-2 flex justify-between gap-2"><div><b className="text-xs">{c.author_name}:</b> {c.content||c.body} <button onClick={()=>toggleCommentLike(c.id)} className={`ml-3 text-xs ${cliked?'text-red-600':'opacity-50'}`}>{cliked?'❤️':'🤍'} {cl.length}</button></div>{canDelC && <button onClick={()=>deleteComment(c.id,p.id)} className="text-[10px] opacity-30">🗑️</button>}</div>); })}
                  <div className="flex gap-2 pt-2"><input value={commentText[p.id]||''} onChange={e=>setCommentText((prev)=>({...prev,[p.id]:e.target.value}))} placeholder="Add comment..." className="flex-1 bg-white border rounded-full px-3 py-2 text-sm" /><button onClick={()=>addComment(p.id)} className="bg-[#1a3a2f] text-white px-4 py-2 rounded-full text-xs font-bold">Reply</button></div>
                </div>
              )}
            </div>
          )})}
        </main>
        <aside className="bg-white rounded-2xl p-5 border h-fit"><h3 className="font-black">{cur?.name}</h3><p className="text-xs opacity-60">{cur?.zip} KC, MO</p><div className="grid grid-cols-2 gap-2 mt-4"><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b>{cur?.member_count||247}</b><p className="text-xs">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b>{posts.length}</b><p className="text-xs">POSTS</p></div></div>{profile && <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl"><p className="text-xs font-bold text-green-800">✅ {profile.full_name}</p><p className="text-[10px] text-green-600">{profile.street_address} {profile.tier}</p></div>}</aside>
      </div>
      {showJoin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[24px] sm:rounded-[20px] w-full max-w-[480px] p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4"><h2 className="font-black text-xl">Join {cur?.name}</h2><button onClick={()=>setShowJoin(false)} className="w-8 h-8 rounded-full bg-black/5">✕</button></div>
            <div className="space-y-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/>
              <div className="bg-[#f8f5ee] rounded-xl p-3 border"><p className="font-black text-sm">Option 1: 5 Mile</p><div className="flex gap-2 mt-2"><input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="304 NE 115TH ST" className="flex-1 bg-white border rounded-xl px-3 py-2.5 text-sm"/><input value={zip} onChange={e=>setZip(e.target.value)} placeholder="ZIP" className="w-[90px] bg-white border rounded-xl px-3 py-2.5 text-sm"/></div></div>
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
                <p className="font-black text-sm text-green-900">Option 2: 40 Mile - FREE OCR 📬✅</p>
                <p className="text-[11px] text-green-700 mt-1">Upload envelope (upside-down OK). No OpenAI key!</p>
                <input type="file" accept="image/*" onChange={e=>setMailFile(e.target.files?.[0]||null)} className="mt-2 text-xs w-full"/>
                <button disabled={!mailFile||aiVerifying} onClick={handleAiVerify} className="mt-2 w-full bg-green-600 text-white py-2.5 rounded-full font-black text-sm disabled:opacity-30">{aiVerifying?'📖 Reading FREE...':'✅ Verify Mail - FREE'}</button>
                {aiParsedAddress && <div className="mt-2 p-2.5 bg-white border border-green-300 rounded-xl text-[11px]"><p className="font-black text-green-800">✓ FREE:</p><p className="text-green-700 font-bold">{aiParsedAddress.street} | {aiParsedAddress.zip}</p><p className="text-green-600 text-xs">{aiParsedAddress.full}</p></div>}
                {verifyError && <div className="mt-2 p-2.5 rounded-xl text-[11px] font-bold bg-red-50 border border-red-300 text-red-700 whitespace-pre-wrap">{verifyError}</div>}
                {showBluetoothRequest && <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-300 rounded-xl"><p className="font-black text-[12px]">📲 Bluetooth Tap (30ft)</p><button onClick={async()=>{ try{ await fetch('/api/request-bluetooth-approval',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({owner: showBluetoothRequest.owner, requester: name, address: showBluetoothRequest.address, street: aiParsedAddress?.street, zip: aiParsedAddress?.zip})}); alert(`Sent to ${showBluetoothRequest.owner}!`); }catch(e:any){ alert(e.message); } }} className="w-full mt-2 bg-blue-600 text-white py-2.5 rounded-full font-black text-xs">📲 Request Bluetooth Tap</button></div>}
              </div>
            </div>
            <div className="flex gap-2 mt-5"><button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button><button onClick={async()=>{ if(!name) return alert('Name'); const pr={full_name:name,email,street_address:addr,zip:zip||cur?.zip, tier:'5mile', is_verified:false, neighborhood_id:cur?.id}; localStorage.setItem('nkc_profile_tiered_40',JSON.stringify(pr)); localStorage.setItem('nkc_profile',JSON.stringify(pr)); setShowJoin(false); location.reload(); }} className="flex-1 bg-amber-500 py-3 rounded-full font-bold text-sm">Join 5 Mile</button><button disabled={!aiVerified} onClick={async()=>{ if(!aiVerified) return; try{ const { error } = await supabase.from('verified_addresses').insert({ street: aiParsedAddress.street, zip: aiParsedAddress.zip, full_address: aiParsedAddress.full, owner_name: name, verified_at: new Date().toISOString() } as any); }catch{} const pr={full_name:name,email,street_address:aiParsedAddress.street,zip:aiParsedAddress.zip, tier:'40mile', is_verified:true, via_mail:true, is_founder:true, neighborhood_id:cur?.id}; localStorage.setItem('nkc_profile_tiered_40',JSON.stringify(pr)); localStorage.setItem('nkc_profile',JSON.stringify(pr)); setShowJoin(false); alert(`✅ ${aiParsedAddress.full} - 40 mile unlocked`); location.reload(); }} className="flex-1 py-3 rounded-full font-bold text-sm bg-black text-white disabled:opacity-30">Join 40 Mile ✅</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
