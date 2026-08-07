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
  const isAdmin = profile?.full_name?.toLowerCase().includes('jason');
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
