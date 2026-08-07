'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];
async function compressImage(file: File): Promise<File> {
  const img = document.createElement('img'); const canvas = document.createElement('canvas');
  const dataUrl = await new Promise<string>(r=>{ const reader=new FileReader(); reader.onload=()=>r(reader.result as string); reader.readAsDataURL(file); });
  await new Promise<void>(res=>{ img.onload=()=>res(); img.src=dataUrl; });
  const max=1200; let {width,height}=img; if(width>max||height>max){ if(width>height){height=height*max/width;width=max;} else {width=width*max/height;height=max;}}
  canvas.width=width; canvas.height=height; canvas.getContext('2d')!.drawImage(img,0,0,width,height);
  const blob = await new Promise<Blob>(res=>canvas.toBlob(b=>res(b!), 'image/jpeg', 0.7));
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {type:'image/jpeg'});
}
export default function Page(){
  const [hoods,setHoods]=useState<any[]>([]); const [posts,setPosts]=useState<any[]>([]);
  const [comments,setComments]=useState<any>({}); const [likes,setLikes]=useState<any>({}); const [cLikes,setCLikes]=useState<any>({});
  const [openComments,setOpenComments]=useState<any>({}); const [commentText,setCommentText]=useState<any>({});
  const [hood,setHood]=useState('parkwood-hills'); const [cat,setCat]=useState('All'); const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null); const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [addr,setAddr]=useState('');
  const [file,setFile]=useState<File|null>(null); const [uploading,setUploading]=useState(false);
  const loadAll = async (postIds:string[]) => {
    if(!postIds.length) return;
    const {data:com}=await supabase.from('comments').select('*').in('post_id', postIds).order('created_at',{ascending:false});
    if(com){ const g:any={}; com.forEach((c:any)=>{ if(!g[c.post_id]) g[c.post_id]=[]; g[c.post_id].push(c); }); setComments(g);
      const cIds=com.map((c:any)=>c.id);
      if(cIds.length){ const {data:cl}=await supabase.from('likes').select('*').in('comment_id', cIds); if(cl){ const cg:any={}; cl.forEach((l:any)=>{ if(!cg[l.comment_id]) cg[l.comment_id]=[]; cg[l.comment_id].push(l); }); setCLikes(cg); } }
    }
    const {data:lk}=await supabase.from('likes').select('*').in('post_id', postIds).is('comment_id', null);
    if(lk){ const lg:any={}; lk.forEach((l:any)=>{ if(!lg[l.post_id]) lg[l.post_id]=[]; lg[l.post_id].push(l); }); setLikes(lg); }
  };
  useEffect(()=>{ (async()=>{
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false}); if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(50);
    if(p){ setPosts(p); loadAll(p.map((x:any)=>x.id)); }
    const s=typeof window!=='undefined'? localStorage.getItem('nkc_profile'):null; if(s) setProfile(JSON.parse(s));
  })() },[]);
  const cur = hoods.find((x:any)=>x.slug===hood) || hoods[0] || {name:'Parkwood Hills', zip:'64155', id: null, slug:'parkwood-hills', member_count: 247};
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);
  const handlePost = async () => {
    if(!profile) return setShowJoin(true); if(!body.trim() &&!file) return;
    if(file && file.size > 3*1024*1024){ alert('Max 3MB!'); return; }
    setUploading(true);
    try{
      let image_url: string | null = null;
      if(file){ const compressed=await compressImage(file); const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const {error: upErr}=await supabase.storage.from('post-images').upload(path, compressed); if(upErr) throw upErr;
        const {data}=supabase.storage.from('post-images').getPublicUrl(path); image_url=data.publicUrl;
      }
      const realId = hoods.find((x:any)=>x.slug===hood)?.id || cur?.id;
      const { data, error } = await supabase.from('posts').insert({ body, category: cat==='All'? 'General' : cat, neighborhood_id: realId, image_url }).select().single();
      if(error) throw error; setPosts([{...data, profiles:{full_name:profile.full_name}},...posts]); setBody(''); setFile(null); (document.getElementById('file-input') as any).value='';
    } catch(e:any){ alert('Could not save: '+(e.message||e)); } finally{ setUploading(false); }
  };
  const addComment = async (postId:string) => {
    if(!profile) return setShowJoin(true); const text=commentText[postId]?.trim(); if(!text) return;
    const {data, error}=await supabase.from('comments').insert({ post_id: postId, content:text, body:text, author_name:profile.full_name }).select().single();
    if(error) return alert(error.message);
    setComments((prev:any)=> ({...prev, [postId]: [data,...(prev[postId]||[])]}));
    setCommentText((prev:any)=>({...prev,[postId]:''}));
  };
  const togglePostLike = async (postId:string) => {
    if(!profile) return setShowJoin(true);
    const myLike = (likes[postId]||[]).find((l:any)=>l.author_name===profile.full_name);
    if(myLike){ await supabase.from('likes').delete().eq('id', myLike.id); setLikes((p:any)=>({...p,[postId]:p[postId].filter((x:any)=>x.id!==myLike.id)})); }
    else { const {data}=await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name}).select().single(); if(data) setLikes((p:any)=>({...p,[postId]:[...(p[postId]||[]), data]})); }
  };
  const toggleCommentLike = async (cId:string) => {
    if(!profile) return setShowJoin(true);
    const myLike = (cLikes[cId]||[]).find((l:any)=>l.author_name===profile.full_name);
    if(myLike){ await supabase.from('likes').delete().eq('id', myLike.id); setCLikes((p:any)=>({...p,[cId]:p[cId].filter((x:any)=>x.id!==myLike.id)})); }
    else { const {data}=await supabase.from('likes').insert({comment_id:cId, author_name:profile.full_name}).select().single(); if(data) setCLikes((p:any)=>({...p,[cId]:[...(p[cId]||[]), data]})); }
  };
  const deletePost = async (id:string, image_url:string|null) => {
    if(!confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', id);
    if(image_url){ const path=image_url.split('/post-images/')[1]; if(path) await supabase.storage.from('post-images').remove([path]); }
    setPosts(posts.filter((p:any)=>p.id!==id));
  };
  const deleteComment = async (cId:string, postId:string) => {
    if(!confirm('Delete comment?')) return;
    await supabase.from('comments').delete().eq('id', cId);
    setComments((prev:any)=>({...prev,[postId]:prev[postId].filter((x:any)=>x.id!==cId)}));
  };
  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#1a3a2f]">
      <header className="sticky top-0 bg-white border-b z-40"><div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-[#1a3a2f] text-white rounded-lg flex items-center justify-center font-black">N</div><b>Neighborly KC</b><span className="ml-3 text-xs bg-green-100 border px-2 py-1 rounded-full font-bold">● LIVE {cur?.name} {cur?.zip}</span></div>
        <div className="flex gap-2"><select value={hood} onChange={e=>setHood(e.target.value)} className="bg-[#f8f5ee] border rounded-full px-4 py-2 text-sm font-bold">{hoods.map((h:any)=><option key={h.slug} value={h.slug}>{h.name} {h.zip}</option>)}</select>{profile?<span className="bg-[#1a3a2f] text-white px-4 py-2 rounded-full text-sm">Hi, {profile.full_name.split(' ')[0]} ✓</span>:<button onClick={()=>setShowJoin(true)} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full text-sm font-bold">Join {cur?.name}</button>}</div>
      </div></header>
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-6">
        <aside className="bg-white rounded-2xl p-3 h-fit border hidden lg:block"><p className="text-xs font-bold opacity-40 px-3 py-2">FILTER</p>{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${cat===c?'bg-[#1a3a2f] text-white':'hover:bg-black/5'}`}>{c}</button>)}</aside>
        <main className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border">
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={profile?`What's up in ${cur?.name}?`:'Join Parkwood Hills to post...'} className="w-full bg-[#f8f5ee] rounded-xl p-3 min-h- text-sm outline-none" />
            <div className="flex items-center gap-2 mt-3"><input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs" />{file && <span className="text-xs opacity-60">{(file.size/1024).toFixed(0)}KB → ~400KB</span>}</div>
            <div className="flex justify-end mt-2"><button disabled={uploading} onClick={handlePost} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50">{uploading?'Uploading...':'Post to neighbors'}</button></div>
          </div>
          {filtered.map((p:any)=>{
            const cList=comments[p.id]||[]; const isOpen=openComments[p.id]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_name===profile?.full_name);
            const canDelete =!!profile;
            return (
            <div key={p.id} className="bg-white rounded-2xl p-4 border">
              <div className="flex justify-between"><p className="text-xs font-bold opacity-60">{p.profiles?.full_name||p.author_name||'Neighbor'} · {p.category}</p>{canDelete && <button onClick={()=>deletePost(p.id,p.image_url)} className="text-xs opacity-40 hover:text-red-600">🗑️ Delete</button>}</div>
              <p className="mt-1 whitespace-pre-wrap">{p.body || p.content}</p>
              {p.image_url && <img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h- w-full object-cover border" />}
              <p className="text-xs opacity-40 mt-2">{new Date(p.created_at).toLocaleString()}</p>
              <div className="mt-3 pt-3 border-t flex gap-4">
                <button onClick={()=>togglePostLike(p.id)} className={`text-xs font-bold ${liked?'text-red-600':'opacity-60 hover:opacity-100'}`}>{liked?'❤️':'🤍'} {pLikes.length} {pLikes.length===1?'Like':'Likes'}</button>
                <button onClick={()=>setOpenComments((prev:any)=>({...prev,[p.id]:!prev[p.id]}))} className="text-xs font-bold hover:underline opacity-60">💬 {cList.length} Comment{cList.length!==1?'s':''} {isOpen?'▲':'▼'}</button>
              </div>
              {isOpen && (
                <div className="mt-3 bg-[#f8f5ee] rounded-xl p-3 space-y-2">
                  {cList.map((c:any)=>{
                    const cl=cLikes[c.id]||[]; const cliked=cl.some((l:any)=>l.author_name===profile?.full_name);
                    const canDelC =!!profile;
                    return (<div key={c.id} className="text-sm bg-white rounded-lg p-2 flex justify-between gap-2">
                      <div><b className="text-xs">{c.author_name}:</b> {c.content||c.body} <span className="text- opacity-40 ml-2">{new Date(c.created_at).toLocaleTimeString()}</span>
                      <button onClick={()=>toggleCommentLike(c.id)} className={`ml-3 text-xs ${cliked?'text-red-600':'opacity-50'}`}>{cliked?'❤️':'🤍'} {cl.length}</button>
                      </div>
                      {canDelC && <button onClick={()=>deleteComment(c.id,p.id)} className="text- opacity-30 hover:text-red-600">🗑️</button>}
                    </div>);
                  })}
                  {cList.length===0 && <p className="text-xs opacity-50">Be first to comment — newest on top</p>}
                  <div className="flex gap-2 pt-2"><input value={commentText[p.id]||''} onChange={e=>setCommentText((prev:any)=>({...prev,[p.id]:e.target.value}))} placeholder={profile?'Add a comment...':'Join to comment'} className="flex-1 bg-white border rounded-full px-3 py-2 text-sm outline-none" /><button onClick={()=>addComment(p.id)} className="bg-[#1a3a2f] text-white px-4 py-2 rounded-full text-xs font-bold">Reply</button></div>
                </div>
              )}
            </div>
          )})}
        </main>
        <aside className="bg-white rounded-2xl p-5 border h-fit"><h3 className="font-black">{cur?.name}</h3><p className="text-xs opacity-60">{cur?.zip} · Kansas City, MO</p><div className="grid grid-cols-2 gap-2 mt-4"><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{cur?.member_count}</b><p className="text-xs">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{posts.length}</b><p className="text-xs">POSTS</p></div></div></aside>
      </div>
      {showJoin && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-sm p-6"><h2 className="font-black text-xl">Join {cur?.name}</h2><form onSubmit={e=>{e.preventDefault(); const pr={full_name:name,email,street_address:addr,zip:cur?.zip,neighborhood_id:cur?.id}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false);}} className="mt-4 space-y-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><input required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><input required value={addr} onChange={e=>setAddr(e.target.value)} placeholder={`Address in ${cur?.zip}`} className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><div className="flex gap-2 pt-2"><button type="button" onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button><button className="flex-1 bg-[#1a3a2f] text-white py-3 rounded-full font-bold text-sm">Join</button></div></form></div></div>}
    </div>
  );
}
