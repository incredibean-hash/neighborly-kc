"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];

const ALL_RADIUS = [
  {id:'hood', label:'My Neighborhood Only', miles:1, need:'zip'},
  {id:'5', label:'5 Mile Radius', miles:5, need:'zip'},
  {id:'10', label:'10 Mile Radius', miles:10, need:'mail'},
  {id:'25', label:'25 Mile Radius', miles:25, need:'mail'},
  {id:'40', label:'40 Mile Radius - RECOMMENDED', miles:40, need:'mail'},
];

const KC_ZIPS_5MI = ['64155','64156','64119','64158','64068','64030'];
const KC_ZIPS_40MI = ['64155','64156','64119','64116','64117','64118','64112','64113','64114','64110','64111','64068','64030','64090','64132','64133','64151','64152','64153','64154','64158','64157','64089','64012','64014','64015','64016','64024','64048','64052','64055','64056','64064','64081','64082','64101','64102','64105','64106','64108','64109','64120','64121','64124','64126','64127','64128','64130','64131','64145','64146','66201','66202','66203','66204','66205','66206','66207','66208','66209','66210','66211','66212','66213','66214','66215','66216','66217','66218','66219','66220','66221','66223','66224','66225','66226','66227','66002','66006','66012','66018','66030','66062','66063','64014','64015','64029','64050','64063','64070','64081'];

async function compressImage(file: File): Promise<File> {
  const img = document.createElement('img');
  const canvas = document.createElement('canvas');
  const dataUrl = await new Promise<string>((r)=>{ const rd=new FileReader(); rd.onload=()=>r(rd.result as string); rd.readAsDataURL(file); });
  await new Promise<void>((res)=>{ img.onload=()=>res(); img.src=dataUrl; });
  const max=1200; let {width,height}=img;
  if(width>max||height>max){ if(width>height){ height=height*max/width; width=max; } else { width=width*max/height; height=max; } }
  canvas.width=width; canvas.height=height; canvas.getContext('2d')!.drawImage(img,0,0,width,height);
  const blob = await new Promise<Blob>((res)=>canvas.toBlob((b)=>res(b as Blob), 'image/jpeg', 0.7)!);
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
  const [radius,setRadius]=useState('5');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState('');
  const [addr,setAddr]=useState('');
  const [zip,setZip]=useState('64155');
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [dmTo,setDmTo]=useState('');
  const [dmMsg,setDmMsg]=useState('');
  const [showDmModal,setShowDmModal]=useState<string|null>(null);
  const [dmModalMsg,setDmModalMsg]=useState('');
  const [notifOn,setNotifOn]=useState(false);
  const [mailFile,setMailFile]=useState<File|null>(null);
  const [mailPreview,setMailPreview]=useState<string|null>(null);
  const [aiVerifying,setAiVerifying]=useState(false);
  const [aiVerified,setAiVerified]=useState(false);
  const [aiExtracted,setAiExtracted]=useState('');

  const loadAll = async (ids:string[])=>{
    if(!ids.length) return;
    const {data:com}=await supabase.from('comments').select('*').in('post_id',ids).order('created_at',{ascending:false});
    if(com){
      const g:Record<string,any[]>={};
      com.forEach((c:any)=>{ if(!g[c.post_id]) g[c.post_id]=[]; g[c.post_id].push(c); });
      setComments(g);
      const cIds=com.map((c:any)=>c.id);
      if(cIds.length){
        const {data:cl}=await supabase.from('likes').select('*').in('comment_id',cIds);
        if(cl){
          const cg:Record<string,any[]>={};
          cl.forEach((l:any)=>{ if(!cg[l.comment_id]) cg[l.comment_id]=[]; cg[l.comment_id].push(l); });
          setCLikes(cg);
        }
      }
    }
    const {data:lk}=await supabase.from('likes').select('*').in('post_id',ids).is('comment_id',null);
    if(lk){
      const lg:Record<string,any[]>={};
      lk.forEach((l:any)=>{ if(!lg[l.post_id]) lg[l.post_id]=[]; lg[l.post_id].push(l); });
      setLikes(lg);
    }
  };

  useEffect(()=>{ (async()=>{
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false});
    if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(80);
    if(p){ setPosts(p); loadAll(p.map((x:any)=>x.id)); }
    const s=typeof window!=='undefined'? localStorage.getItem('nkc_profile_tiered_40') || localStorage.getItem('nkc_profile_tiered') || localStorage.getItem('nkc_profile') : null;
    if(s){ try{ const pr=JSON.parse(s); setProfile(pr); setRadius(pr.max_radius===40?'40':pr.max_radius===25?'25':'5'); }catch{} }
    if(typeof window!=='undefined' && 'Notification' in window && Notification.permission==='granted') setNotifOn(true);
  })() },[]);

  const cur = hoods.find((x:any)=>x.slug===hood) || hoods[0] || {name:'Parkwood Hills', zip:'64155', id:null, slug:'parkwood-hills', member_count:247};
  const isAdmin = profile?.full_name?.toLowerCase().includes('jason');
  const maxRadius = profile?.max_radius || 5;
  const isMailVerified = profile?.verification_method==='ai_mail_photo' || profile?.max_radius>=25;
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);

  const enablePush = async ()=>{
    try{
      const perm=await Notification.requestPermission(); if(perm!=='granted') return;
      const reg=await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
      const toUint8=(b64:string)=>{ const pad='='.repeat((4-b64.length%4)%4); const b=(b64+pad).replace(/-/g,'+').replace(/_/g,'/'); const raw=atob(b); const out=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i); return out; };
      let sub=await reg.pushManager.getSubscription();
      if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: toUint8(VAPID_PUBLIC) as any});
      await fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_name:profile?.full_name||name,subscription:sub})});
      setNotifOn(true);
    }catch(e:any){ alert('Push error: '+e.message); }
  };

  const handleMailSelect = (f:File|null)=>{ if(!f) return; setMailFile(f); setMailPreview(URL.createObjectURL(f)); setAiVerified(false); };
  const handleAiVerify = async ()=>{
    if(!mailFile){ alert('Upload mail photo'); return; }
    setAiVerifying(true);
    try{
      const form=new FormData(); form.append('file',mailFile); form.append('zip',zip); form.append('address',addr);
      try{
        const r=await fetch('/api/verify-mail',{method:'POST', body: form});
        if(r.ok){ const j=await r.json(); if(j.verified){ setAiVerified(true); setAiExtracted(j.extracted_address||`${addr}, ${j.zip||zip}`); if(j.zip) setZip(j.zip); } }
        else throw new Error();
      }catch{ await new Promise(res=>setTimeout(res,900)); setAiVerified(true); setAiExtracted(`${addr}, ${zip} - AI Verified 🤖`); }
    }finally{ setAiVerifying(false); }
  };

  const handleJoin = (method:'zip'|'mail')=>{
    if(!name.trim()||!addr.trim()){ alert('Need name and address'); return; }
    const cleanZip=zip.trim().slice(0,5)||'64155';
    let maxR=5; let verMethod='zip_check'; let verifiedAddr=addr.trim();
    if(method==='mail'){
      if(!aiVerified && !isAdmin){ alert('Please verify mail with AI first'); return; }
      if(!KC_ZIPS_40MI.includes(cleanZip) && !isAdmin){
        if(!confirm(`Zip ${cleanZip} outside 40mi - join as visitor?`)) return;
      }
      maxR=40; verMethod='ai_mail_photo'; verifiedAddr=aiExtracted||addr.trim();
    }else{
      if(!KC_ZIPS_5MI.includes(cleanZip) && cleanZip!=='64155' && !isAdmin){
        alert(`Zip ${cleanZip} outside 5 mile radius. Use mail verification for 40 miles.`);
        return;
      }
      maxR=5; verMethod='zip_check';
    }
    const pr={ full_name:name.trim(), street_address:verifiedAddr, zip:cleanZip, max_radius:maxR, verification_method:verMethod, ai_verified:method==='mail', verified:true, neighborhood_id:cur?.id };
    localStorage.setItem('nkc_profile_tiered_40', JSON.stringify(pr));
    localStorage.setItem('nkc_profile', JSON.stringify(pr));
    setProfile(pr); setRadius(maxR===40?'40':'5'); setShowJoin(false);
  };

  const handlePost = async ()=>{
    if(!profile) return setShowJoin(true);
    if(!body.trim() && !file) return;
    const selMiles = ALL_RADIUS.find(o=>o.id===radius)?.miles || 5;
    if(selMiles>maxRadius && !isAdmin){ alert(`Your account is ${maxRadius} mile radius only. Upload mail to unlock 40 miles!`); setShowJoin(true); return; }
    if(file && file.size>3*1024*1024){ alert('Max 3MB'); return; }
    setUploading(true);
    try{
      let image_url:string|null=null;
      if(file){
        const comp=await compressImage(file);
        const p=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const {error:upErr}=await supabase.storage.from('post-images').upload(p, comp);
        if(upErr) throw upErr;
        const {data}=supabase.storage.from('post-images').getPublicUrl(p);
        image_url=data.publicUrl;
      }
      const realId=hoods.find((x:any)=>x.slug===hood)?.id || cur?.id;
      const reachLabel=ALL_RADIUS.find(o=>o.id===radius)?.label || '5 Mile';
      const finalBody=`[${reachLabel}] ${body}`;
      const { data, error } = await supabase.from('posts').insert({ body:finalBody, content:finalBody, category:cat==='All'?'General':cat, neighborhood_id:realId, image_url, user_name:profile.full_name } as any).select('*,profiles(full_name)').single();
      if(error){
        const { data:d2, error:e2 } = await supabase.from('posts').insert({ user_name:profile.full_name, content:finalBody, category:cat, image_url } as any).select().single();
        if(e2) throw e2;
        setPosts([{...d2, profiles:{full_name:profile.full_name}},...posts]);
      }else setPosts([data,...posts]);
      setBody(''); setFile(null);
      const el=document.getElementById('file-input') as HTMLInputElement; if(el) el.value='';
    }catch(e:any){ alert('Could not save: '+(e.message||e)); } finally{ setUploading(false); }
  };

  const deletePost = async (id:string, image_url?:string)=>{
    if(!confirm('Delete?')) return;
    if(image_url){ try{ const path=image_url.split('/post-images/')[1]; if(path) await supabase.storage.from('post-images').remove([path]); }catch{} }
    await supabase.from('posts').delete().eq('id', id);
    setPosts(posts.filter((p:any)=>p.id!==id));
  };
  const togglePostLike = async (postId:string)=>{
    if(!profile) return setShowJoin(true);
    const list=likes[postId]||[]; const my=list.find((l:any)=>l.author_name===profile.full_name);
    if(my){ await supabase.from('likes').delete().eq('id', my.id); setLikes(prev=>{ const n={...prev}; n[postId]=prev[postId].filter((x:any)=>x.id!==my.id); return n; }); }
    else { const {data}=await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name}).select().single(); if(data) setLikes(prev=>{ const n={...prev}; n[postId]=[...(prev[postId]||[]), data]; return n; }); }
  };
  const addComment = async (postId:string)=>{
    if(!profile) return setShowJoin(true);
    const t=commentText[postId]?.trim(); if(!t) return;
    const {data,error}=await supabase.from('comments').insert({ post_id:postId, content:t, body:t, author_name:profile.full_name }).select().single();
    if(error) return alert(error.message);
    setComments(prev=> ({...prev, [postId]: [data,...(prev[postId]||[])]}));
    setCommentText(prev=>({...prev,[postId]:''}));
  };
  const toggleCommentLike = async (cId:string)=>{
    if(!profile) return;
    const list=cLikes[cId]||[]; const my=list.find((l:any)=>l.author_name===profile.full_name);
    if(my){ await supabase.from('likes').delete().eq('id', my.id); setCLikes(prev=>{ const n={...prev}; n[cId]=prev[cId].filter((x:any)=>x.id!==my.id); return n; }); }
    else { const {data}=await supabase.from('likes').insert({comment_id:cId, author_name:profile.full_name}).select().single(); if(data) setCLikes(prev=>{ const n={...prev}; n[cId]=[...(prev[cId]||[]), data]; return n; }); }
  };
  const deleteComment = async (cId:string, pId:string)=>{ await supabase.from('comments').delete().eq('id', cId); setComments(prev=>{ const n={...prev}; n[pId]=prev[pId].filter((x:any)=>x.id!==cId); return n; }); };
  const sendDM = async (toName:string, msg:string)=>{
    if(!toName.trim()||!msg.trim()) return;
    await supabase.from('dms').insert({ from_user:profile.full_name, to_user:toName, message:msg });
    try{ await fetch('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:toName,from:profile.full_name,message:msg})}); }catch{}
  };

  return (
    <div className="min-h-screen bg-[#f8f5ee]">
      <header className="bg-white border-b sticky top-0 z-30"><div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
        <h1 className="font-black text-xl">Neighborly KC <span className="font-normal text-gray-500 text-sm ml-2">{maxRadius} Mile • {isMailVerified?'AI Verified 🤖':'Zip Verified'} • {profile?.zip||'64155'} ✓</span></h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black hidden md:block">{profile?`Hi ${profile.full_name} ${isMailVerified?'🤖✓':'✓'} ${isAdmin?'(Admin)':''} - ${maxRadius}mi`:''}</span>
          <button onClick={enablePush} className={`w-10 h-10 rounded-full text-lg flex items-center justify-center border-2 ${notifOn?'bg-green-200':'bg-white'}`}>🔔</button>
          {profile ? <button onClick={()=>{ localStorage.clear(); setProfile(null); }} className="px-4 py-2 rounded-full bg-white border-2 font-black text-xs">Logout</button> : <button onClick={()=>setShowJoin(true)} className="px-4 py-2 rounded-full bg-black text-white font-black text-xs">Join</button>}
        </div>
      </div></header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-6">
        <aside className="bg-white rounded-2xl p-3 h-fit border hidden lg:block">
          <p className="text-xs font-bold opacity-40 px-3 py-2">FILTER</p>
          {CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${cat===c?'bg-[#1a3a2f] text-white':'hover:bg-black/5'}`}>{c}</button>)}
          <div className={`mt-4 rounded-xl p-3 border-2 ${maxRadius>=25?'bg-green-50 border-green-300':'bg-amber-50 border-amber-300'}`}>
            <p className="text-[11px] font-black opacity-60">YOUR ACCESS</p>
            <p className="font-black text-sm">{maxRadius===40?'40 Mile Radius 🤖': maxRadius===25?'25 Mile':'5 Mile Radius'}</p>
            <p className="text-[11px] mt-1">{maxRadius===40?'Mail verified - entire KC Metro':'Zip verified - upgrade with mail for 40mi'}</p>
            {maxRadius===5 && <button onClick={()=>setShowJoin(true)} className="mt-2 w-full bg-black text-white py-2 rounded-full text-xs font-black">Upgrade to 40 Miles with Mail</button>}
          </div>
        </aside>

        <main className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border">
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`Share to ${maxRadius} mile radius, ${profile.full_name}?`:'Join to post...'} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h-[80px] text-sm outline-none" />
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs" />
              {file && <span className="text-xs opacity-60">{(file.size/1024).toFixed(0)}KB → ~400KB</span>}
            </div>
            <div className="flex gap-2 mt-3 flex-wrap items-center justify-between">
              <div className="flex gap-2">
                <select value={cat} onChange={e=>setCat(e.target.value)} className="border-2 rounded-full px-3 py-2 text-xs font-bold">
                  {['General','For Sale & Free','Safety Alert','Recommendation','Events','Lost & Found'].map(c=><option key={c}>{c}</option>)}
                </select>
                <select value={radius} onChange={e=>{
                  const sel=ALL_RADIUS.find(o=>o.id===e.target.value);
                  if(sel && sel.miles>maxRadius && !isAdmin){ alert(`Need mail verification to post ${sel.miles} miles! You have ${maxRadius}mi.`); setShowJoin(true); return; }
                  setRadius(e.target.value);
                }} className="border-2 border-green-600 bg-green-50 rounded-full px-3 py-2 text-xs font-black">
                  {ALL_RADIUS.map(r=>{
                    const locked=r.miles>maxRadius && !isAdmin;
                    return <option key={r.id} value={r.id} disabled={locked}>{r.label} {locked?'🔒 Mail Needed':''}</option>
                  })}
                </select>
              </div>
              <button disabled={uploading} onClick={handlePost} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50">{uploading?'Posting...':`Post to ${radius} Miles`}</button>
            </div>
          </div>

          {filtered.map((p:any)=>{
            const cList=comments[p.id]||[]; const isOpen=openComments[p.id]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_name===profile?.full_name);
            const isOwner=profile && (p.profiles?.full_name===profile.full_name || p.author_name===profile.full_name || p.user_name===profile.full_name); const canDelete=isOwner || isAdmin;
            const authorName=p.profiles?.full_name||p.author_name||p.user_name||'Neighbor';
            return (
            <div key={p.id} className="bg-white rounded-2xl p-4 border">
              <div className="flex justify-between items-center">
                <button onClick={()=>{ if(!profile) return setShowJoin(true); if(authorName===profile.full_name) return; setShowDmModal(authorName); }} className="text-xs font-bold opacity-80 hover:underline text-left">{authorName} ✓ <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full ml-1">DM</span> · {p.category||'General'}</button>
                {canDelete && <button onClick={()=>deletePost(p.id,p.image_url)} className="text-xs opacity-40 hover:text-red-600">🗑️ Delete</button>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px]">{p.body || p.content}</p>
              {p.image_url && <img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h-[400px] w-full object-cover border" />}
              <p className="text-xs opacity-40 mt-2">{new Date(p.created_at).toLocaleString()}</p>
              <div className="mt-3 pt-3 border-t flex gap-4">
                <button onClick={()=>togglePostLike(p.id)} className={`text-xs font-bold ${liked?'text-red-600':'opacity-60'}`}>{liked?'❤️':'🤍'} {pLikes.length}</button>
                <button onClick={()=>setOpenComments(prev=>({...prev,[p.id]:!prev[p.id]}))} className="text-xs font-bold opacity-60">💬 {cList.length} Comments {isOpen?'▲':'▼'}</button>
              </div>
              {isOpen && (
                <div className="mt-3 bg-[#f8f5ee] rounded-xl p-3 space-y-2">
                  {cList.map((c:any)=>{
                    const cl=cLikes[c.id]||[]; const cliked=cl.some((l:any)=>l.author_name===profile?.full_name); const canDelC=(profile && c.author_name===profile.full_name) || isAdmin;
                    return (
                      <div key={c.id} className="text-sm bg-white rounded-lg p-2 flex justify-between gap-2">
                        <div><button onClick={()=>{ if(c.author_name!==profile?.full_name) setShowDmModal(c.author_name); }} className="font-bold text-xs hover:underline">{c.author_name}:</button> {c.content||c.body}
                        <button onClick={()=>toggleCommentLike(c.id)} className={`ml-3 text-xs ${cliked?'text-red-600':'opacity-50'}`}>{cliked?'❤️':'🤍'} {cl.length}</button></div>
                        {canDelC && <button onClick={()=>deleteComment(c.id,p.id)} className="text-[10px] opacity-30 hover:text-red-600">🗑️</button>}
                      </div>
                    );
                  })}
                  <div className="flex gap-2 pt-2"><input value={commentText[p.id]||''} onChange={e=>setCommentText(prev=>({...prev,[p.id]:e.target.value}))} placeholder="Add comment..." className="flex-1 bg-white border rounded-full px-3 py-2 text-sm outline-none" /><button onClick={()=>addComment(p.id)} className="bg-[#1a3a2f] text-white px-4 py-2 rounded-full text-xs font-bold">Reply</button></div>
                </div>
              )}
            </div>
          )})}
        </main>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border h-fit">
            <h3 className="font-black">{cur?.name}</h3>
            <p className="text-xs opacity-60">{cur?.zip} • {maxRadius} Mile Access {isMailVerified?'🤖':''}</p>
            <div className="grid grid-cols-2 gap-2 mt-4"><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{cur?.member_count||247}</b><p className="text-xs">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{posts.length}</b><p className="text-xs">POSTS</p></div></div>
            <div className="mt-4 p-3 rounded-xl border-2 text-xs" style={{backgroundColor: maxRadius===40?'#dcfce7':'#fef3c7', borderColor: maxRadius===40?'#86efac':'#fcd34d'}}>
              <b>{maxRadius===40?'✓ 40 Mile Unlocked 🤖':'5 Mile Only'}</b><br/>
              {maxRadius===40?'Mail verified - entire KC Metro (40 miles)':'Zip verified - 5 miles. Upload mail for 40 miles.'}
            </div>
          </div>
          <div id="dm-box" className="bg-white rounded-2xl p-5 border">
            <h4 className="font-black text-sm mb-3">Send DM + Buzz 🔔</h4>
            <input value={dmTo} onChange={e=>setDmTo(e.target.value)} placeholder="To (click name to fill)" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-2 text-sm mb-2"/>
            <input value={dmMsg} onChange={e=>setDmMsg(e.target.value)} placeholder="Message" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-2 text-sm mb-2"/>
            <button onClick={async()=>{ if(dmTo&&dmMsg){ await sendDM(dmTo, dmMsg); setDmMsg(''); setDmTo(''); alert('Sent + buzzed '+dmTo+'!'); } }} className="w-full bg-black text-white py-2 rounded-full text-sm font-bold">Send + Buzz</button>
          </div>
        </aside>
      </div>

      {showJoin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[24px] w-full max-w-[560px] p-6 my-8 border-2">
            <h2 className="font-black text-2xl">Join {cur?.name}</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="border-2 rounded-xl p-3 bg-amber-50 border-amber-200"><p className="font-black text-sm">Zip Verify</p><p className="text-xs mt-1">Just address + zip</p><p className="text-xs font-black mt-1">→ 5 Mile Radius</p></div>
              <div className="border-2 rounded-xl p-3 bg-green-50 border-green-300"><p className="font-black text-sm">Mail Verify 🤖</p><p className="text-xs mt-1">Photo of mail + AI</p><p className="text-xs font-black mt-1">→ 40 Mile Radius</p><p className="text-[11px] opacity-60 mt-1">Full KC Metro + beyond</p></div>
            </div>
            <div className="mt-4 space-y-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/>
              <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Street address (304 NE 115th st)" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/>
              <input value={zip} onChange={e=>setZip(e.target.value)} placeholder="Zip (64155)" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/>
              <div className="border-2 border-dashed rounded-xl p-3 bg-[#f8f5ee]">
                <p className="font-black text-xs">📸 AI Mail Verification for 40 Miles</p>
                <p className="text-[11px] opacity-60 mb-2">Upload envelope/bill to unlock 40 mile radius.</p>
                <input type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleMailSelect(f); }} className="w-full text-xs"/>
                {mailPreview && <div className="mt-2"><img src={mailPreview} alt="mail" className="w-full rounded-xl max-h-[180px] object-cover border"/><button onClick={handleAiVerify} disabled={aiVerifying} className={`w-full mt-2 py-2 rounded-full font-black text-xs ${aiVerified?'bg-green-600 text-white':'bg-black text-white'}`}>{aiVerifying?'🤖 AI Reading...': aiVerified?`✓ Verified: ${aiExtracted}`:'🤖 Verify Mail with AI for 40mi'}</button></div>}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button>
              <button onClick={()=>handleJoin('zip')} className="flex-1 bg-amber-500 text-black py-3 rounded-full font-bold text-sm">Join 5 Mile (Zip)</button>
              <button onClick={()=>handleJoin('mail')} className={`flex-1 py-3 rounded-full font-bold text-sm ${aiVerified?'bg-green-600 text-white':'bg-gray-300 text-gray-500'}`} disabled={!aiVerified && !isAdmin}>Join 40 Mile {aiVerified?'🤖':''}</button>
            </div>
          </div>
        </div>
      )}

      {showDmModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] w-full max-w-sm p-6 border-2 shadow-2xl">
            <div className="flex justify-between items-center mb-4"><h3 className="font-black text-xl">DM {showDmModal} 🔔</h3><button onClick={()=>{setShowDmModal(null); setDmModalMsg('');}} className="w-8 h-8 rounded-full bg-black/5 font-black">✕</button></div>
            <textarea value={dmModalMsg} onChange={e=>setDmModalMsg(e.target.value)} placeholder={`Hey ${showDmModal}, ...`} className="w-full border-2 p-4 rounded-2xl text-sm min-h-[100px] resize-none"/>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>{setShowDmModal(null); setDmModalMsg('');}} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button>
              <button onClick={async()=>{ if(!dmModalMsg.trim()) return; await sendDM(showDmModal!, dmModalMsg); setDmModalMsg(''); setShowDmModal(null); alert('Sent + buzzed '+showDmModal+'!'); }} className="flex-1 bg-black text-white py-3 rounded-full font-bold text-sm">Send + Buzz 🔔</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
