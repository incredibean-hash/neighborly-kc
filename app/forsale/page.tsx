'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, displayName } from '../../lib/community';
import { useAppTheme } from '../../lib/use-theme';
import MobileBottomNav from '../components/MobileBottomNav';

async function prepareImage(file:File){
  if(!file.type.startsWith('image/'))throw new Error('Please choose an image.');
  if(file.size>15*1024*1024)throw new Error('Images must be 15 MB or smaller.');
  return file;
}

export default function ForSalePage(){
  const theme=useAppTheme();
  const [user,setUser]=useState<any>(null),[profile,setProfile]=useState<any>(null),[items,setItems]=useState<any[]>([]);
  const [kind,setKind]=useState('For Sale'),[text,setText]=useState(''),[file,setFile]=useState<File|null>(null),[sending,setSending]=useState(false),[notice,setNotice]=useState('');
  const load=async()=>{
    const {data:{session}}=await supabase.auth.getSession(); const nextUser=session?.user||null; setUser(nextUser);
    const [{data:posts},{data:mine}]=await Promise.all([
      supabase.from('posts').select('*').eq('category','For Sale & Free').order('created_at',{ascending:false}).limit(50),
      nextUser?supabase.from('profiles').select('auth_user_id,full_name,email,avatar_url').eq('auth_user_id',nextUser.id).maybeSingle():Promise.resolve({data:null})
    ]);
    setProfile(mine||null);
    const rows=posts||[]; const ids=[...new Set(rows.map((p:any)=>p.user_id||p.author_id).filter(Boolean))];
    const {data:people}=ids.length?await supabase.from('profiles').select('auth_user_id,full_name,email,avatar_url').in('auth_user_id',ids):{data:[]};
    const byId=new Map((people||[]).map((person:any)=>[person.auth_user_id,person]));
    setItems(rows.map((post:any)=>({...post,profiles:byId.get(post.user_id||post.author_id)})));
  };
  useEffect(()=>{void load()},[]);
  const submit=async()=>{
    if(!user)return setNotice('Sign in from the feed before creating a listing.');
    if(!text.trim()&&!file)return setNotice('Add a description or photo first.');
    setSending(true);setNotice('');
    try{
      let image_url:string|null=null;
      if(file){const image=await prepareImage(file);const path=`${user.id}/${Date.now()}-${image.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;const {error:uploadError}=await supabase.storage.from('post-images').upload(path,image,{upsert:false,contentType:image.type});if(uploadError)throw uploadError;image_url=supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;}
      const author_name=displayName(profile||{email:user.email});
      const body=`[${kind}] ${text.trim()}`.trim();
      const {data,error}=await supabase.from('posts').insert({user_id:user.id,author_id:user.id,author_name,category:'For Sale & Free',body,content:body,image_url}).select().single();
      if(error)throw error;
      setItems(current=>[{...data,profiles:profile},...current]);setText('');setFile(null);setNotice('Listing posted.');
    }catch(error:any){setNotice(error.message||'Could not post the listing.');}
    finally{setSending(false);}
  };
  return <main className="min-h-screen nkc-subpage-with-nav" style={{backgroundColor:theme.bg,color:theme.text}}>
    <header className="nkc-subpage-header p-4" style={{backgroundColor:theme.header,color:'#fff'}}><div className="max-w-3xl mx-auto"><Link href="/" className="text-xs opacity-75">← Feed</Link><h1 className="text-2xl font-black">For Sale &amp; Free</h1><p className="text-sm opacity-80">Local listings from your Neighborly KC community.</p></div></header>
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <section className="rounded-2xl border p-4" style={{backgroundColor:theme.card,borderColor:theme.border}}><h2 className="font-black">Create a listing</h2><div className="grid sm:grid-cols-[170px_1fr] gap-2 mt-3"><select value={kind} onChange={event=>setKind(event.target.value)} className="rounded-xl px-3 py-3 font-bold" style={{backgroundColor:theme.input,color:theme.text,border:`1px solid ${theme.border}`}}><option>For Sale</option><option>Free</option><option>Wanted</option></select><label className="cursor-pointer rounded-xl border px-3 py-3 text-sm font-bold" style={{borderColor:theme.border}}>📷 Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event=>setFile(event.target.files?.[0]||null)}/>{file&&<span className="ml-2 font-normal opacity-70">{file.name}</span>}</label></div><textarea value={text} onChange={event=>setText(event.target.value)} placeholder="What are you selling, giving away, or looking for? Include a price and pickup area if helpful." className="mt-2 min-h-[110px] w-full rounded-xl p-3 outline-none" style={{backgroundColor:theme.input,color:theme.text,border:`1px solid ${theme.border}`}}/><div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs opacity-60">Listings are public to Neighborly KC members.</p><button disabled={sending} onClick={submit} className="rounded-full px-5 py-2 font-bold disabled:opacity-50" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{sending?'Posting…':'Post listing'}</button></div>{notice&&<p role="status" className="mt-2 text-sm font-bold">{notice}</p>}</section>
      {items.map(item=><article key={item.id} className="rounded-2xl border p-4" style={{backgroundColor:theme.card,borderColor:theme.border}}><div className="flex justify-between gap-3"><b>{displayName(item.profiles||{full_name:item.author_name})}</b><span className="text-xs opacity-55">{new Date(item.created_at).toLocaleDateString()}</span></div><p className="mt-2 whitespace-pre-wrap break-words">{item.body||item.content}</p>{item.image_url&&<img src={item.image_url} alt="Listing" className="mt-3 max-h-[520px] w-full rounded-xl object-cover"/>}</article>)}
      {!items.length&&<p className="py-12 text-center opacity-55">No listings yet. Be the first neighbor to post one.</p>}
    </div><MobileBottomNav theme={theme} active="home" />
  </main>;
}
