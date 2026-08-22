'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase, displayName } from '../../lib/community';
import { useAppTheme } from '../../lib/use-theme';
import MobileBottomNav from '../components/MobileBottomNav';

const CONDITIONS=['New','Like New','Good','Fair','For Parts'];
const ITEM_CATEGORIES=['Furniture','Electronics','Home & Garden','Clothing','Kids & Baby','Sports & Outdoors','Tools','Auto','Collectibles','Other'];

async function prepareImage(file:File){
  if(!file.type.startsWith('image/'))throw new Error('Please choose an image.');
  if(file.size>15*1024*1024)throw new Error('Images must be 15 MB or smaller.');
  return file;
}
function listingKind(item:any){
  const body=String(item.body||item.content||'');
  return body.startsWith('[Free]')?'Free':'For Sale';
}
function cleanBody(item:any){
  return String(item.body||item.content||'').replace(/^\[(?:For Sale|Free|Wanted)\]\s*/,'');
}

export default function ForSalePage(){
  const theme=useAppTheme();
  const [user,setUser]=useState<any>(null),[profile,setProfile]=useState<any>(null),[items,setItems]=useState<any[]>([]);
  const [filter,setFilter]=useState<'All'|'Free'|'For Sale'>('All'),[query,setQuery]=useState('');
  const [showCreate,setShowCreate]=useState(false);
  const [kind,setKind]=useState<'For Sale'|'Free'>('For Sale'),[title,setTitle]=useState(''),[price,setPrice]=useState(''),[condition,setCondition]=useState('Good'),[itemCategory,setItemCategory]=useState('Other'),[text,setText]=useState('');
  const [file,setFile]=useState<File|null>(null),[sending,setSending]=useState(false),[notice,setNotice]=useState('');
  const load=async()=>{
    const {data:{session}}=await supabase.auth.getSession(); const nextUser=session?.user||null; setUser(nextUser);
    const [{data:posts},{data:mine}]=await Promise.all([
      supabase.from('posts').select('*').eq('category','For Sale & Free').order('created_at',{ascending:false}).limit(100),
      nextUser?supabase.from('profiles').select('auth_user_id,full_name,email,avatar_url').eq('auth_user_id',nextUser.id).maybeSingle():Promise.resolve({data:null})
    ]);
    setProfile(mine||null);
    const rows=posts||[]; const ids=[...new Set(rows.map((p:any)=>p.user_id||p.author_id).filter(Boolean))];
    const {data:people}=ids.length?await supabase.from('profiles').select('auth_user_id,full_name,email,avatar_url').in('auth_user_id',ids):{data:[]};
    const byId=new Map((people||[]).map((person:any)=>[person.auth_user_id,person]));
    setItems(rows.map((post:any)=>({...post,profiles:byId.get(post.user_id||post.author_id)})));
  };
  useEffect(()=>{void load(); if(typeof window!=='undefined'){const params=new URLSearchParams(window.location.search);if(params.get('create')==='1')setShowCreate(true);}},[]);
  const visible=useMemo(()=>items.filter(item=>{
    const k=listingKind(item);
    if(filter!=='All'&&k!==filter)return false;
    if(query.trim()&&!String(item.body||item.content||'').toLowerCase().includes(query.trim().toLowerCase()))return false;
    return true;
  }),[items,filter,query]);

  const submit=async()=>{
    if(!user)return setNotice('Sign in from the feed before creating a listing.');
    if(!title.trim())return setNotice('Add an item name.');
    if(kind==='For Sale'&&(!price.trim()||Number(price)<0))return setNotice('Add a price.');
    if(!text.trim()&&!file)return setNotice('Add a description or photo.');
    setSending(true);setNotice('');
    try{
      let image_url:string|null=null;
      if(file){const image=await prepareImage(file);const path=`${user.id}/${Date.now()}-${image.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;const {error:uploadError}=await supabase.storage.from('post-images').upload(path,image,{upsert:false,contentType:image.type});if(uploadError)throw uploadError;image_url=supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;}
      const author_name=displayName(profile||{email:user.email});
      const details=[title.trim(),kind==='For Sale'?`$${Number(price).toFixed(2)}`:'FREE',condition,itemCategory,text.trim()].filter(Boolean).join('\n');
      const body=`[${kind}] ${details}`;
      const {data,error}=await supabase.from('posts').insert({user_id:user.id,author_id:user.id,author_name,category:'For Sale & Free',body,content:body,image_url}).select().single();
      if(error)throw error;
      setItems(current=>[{...data,profiles:profile},...current]);setTitle('');setPrice('');setText('');setFile(null);setNotice('Listing posted.');setShowCreate(false);
    }catch(error:any){setNotice(error.message||'Could not post the listing.');}
    finally{setSending(false);}
  };

  return <main className="min-h-screen nkc-subpage-with-nav" style={{backgroundColor:theme.bg,color:theme.text}}>
    <header className="nkc-subpage-header p-4" style={{backgroundColor:theme.header,color:'#fff'}}>
      <div className="max-w-3xl mx-auto"><Link href="/" className="text-xs opacity-75">← Feed</Link><div className="flex items-end justify-between gap-3"><div><h1 className="text-2xl font-black">For Sale &amp; Free</h1><p className="text-sm opacity-80">Find something nearby or pass something along.</p></div><button onClick={()=>setShowCreate(v=>!v)} className="rounded-full bg-white text-black px-4 py-2 text-sm font-black">{showCreate?'Close':'+ List item'}</button></div></div>
    </header>
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <section className="rounded-2xl border p-3" style={{backgroundColor:theme.card,borderColor:theme.border}}>
        <div className="grid grid-cols-3 gap-2" aria-label="Listing filter">
          {(['All','Free','For Sale'] as const).map(v=><button key={v} onClick={()=>setFilter(v)} className="rounded-full px-3 py-2 text-sm font-black" style={{backgroundColor:filter===v?theme.accent:theme.input,color:filter===v?theme.pillTextActive:theme.text,border:`1px solid ${theme.border}`}}>{v==='All'?'ALL':v.toUpperCase()}</button>)}
        </div>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search items…" className="mt-3 w-full rounded-xl px-4 py-3 outline-none" style={{backgroundColor:theme.input,color:theme.text,border:`1px solid ${theme.border}`}}/>
      </section>

      {showCreate&&<section className="rounded-2xl border p-4" style={{backgroundColor:theme.card,borderColor:theme.border}}>
        <h2 className="font-black text-lg">Create a listing</h2>
        <div className="grid grid-cols-2 gap-2 mt-3">{(['For Sale','Free'] as const).map(v=><button key={v} onClick={()=>setKind(v)} className="rounded-xl py-3 font-black" style={{backgroundColor:kind===v?theme.accent:theme.input,color:kind===v?theme.pillTextActive:theme.text,border:`1px solid ${theme.border}`}}>{v}</button>)}</div>
        <label className="block mt-3 text-xs font-black uppercase opacity-70">Item name</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What is it?" className="mt-1 w-full rounded-xl px-3 py-3" style={{backgroundColor:theme.input,color:theme.text,border:`1px solid ${theme.border}`}}/>
        {kind==='For Sale'&&<><label className="block mt-3 text-xs font-black uppercase opacity-70">Price</label><div className="mt-1 flex items-center rounded-xl px-3" style={{backgroundColor:theme.input,border:`1px solid ${theme.border}`}}><span className="font-black">$</span><input value={price} onChange={e=>setPrice(e.target.value.replace(/[^0-9.]/g,''))} inputMode="decimal" placeholder="0.00" className="w-full bg-transparent px-2 py-3 outline-none" style={{color:theme.text}}/></div></>}
        <div className="grid sm:grid-cols-2 gap-2 mt-3"><div><label className="block text-xs font-black uppercase opacity-70">Condition</label><select value={condition} onChange={e=>setCondition(e.target.value)} className="mt-1 w-full rounded-xl px-3 py-3" style={{backgroundColor:theme.input,color:theme.text,border:`1px solid ${theme.border}`}}>{CONDITIONS.map(v=><option key={v}>{v}</option>)}</select></div><div><label className="block text-xs font-black uppercase opacity-70">Category</label><select value={itemCategory} onChange={e=>setItemCategory(e.target.value)} className="mt-1 w-full rounded-xl px-3 py-3" style={{backgroundColor:theme.input,color:theme.text,border:`1px solid ${theme.border}`}}>{ITEM_CATEGORIES.map(v=><option key={v}>{v}</option>)}</select></div></div>
        <label className="block mt-3 text-xs font-black uppercase opacity-70">Description</label><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Describe the item and anything your neighbor should know about pickup." className="mt-1 min-h-[110px] w-full rounded-xl p-3 outline-none" style={{backgroundColor:theme.input,color:theme.text,border:`1px solid ${theme.border}`}}/>
        <label className="mt-3 block cursor-pointer rounded-xl border px-3 py-3 text-sm font-bold" style={{borderColor:theme.border}}>📷 Add photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>setFile(e.target.files?.[0]||null)}/>{file&&<span className="ml-2 font-normal opacity-70">{file.name}</span>}</label>
        <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs opacity-60">Shared with the NeighborlyKC community.</p><button disabled={sending} onClick={submit} className="rounded-full px-5 py-2 font-black disabled:opacity-50" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{sending?'Posting…':'Post item'}</button></div>{notice&&<p role="status" className="mt-2 text-sm font-bold">{notice}</p>}
      </section>}

      {visible.map(item=>{const k=listingKind(item);const lines=cleanBody(item).split('\n');return <article key={item.id} className="rounded-2xl border overflow-hidden" style={{backgroundColor:theme.card,borderColor:theme.border}}>{item.image_url&&<img src={item.image_url} alt={lines[0]||'Listing'} className="max-h-[520px] w-full object-cover"/>}<div className="p-4"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-wider opacity-60">{k}</span><h2 className="text-lg font-black">{lines[0]||'Listing'}</h2></div>{lines[1]&&<strong className="text-lg" style={{color:theme.accent}}>{lines[1]}</strong>}</div><p className="mt-2 text-sm opacity-75 whitespace-pre-wrap">{lines.slice(2).join(' · ')}</p><div className="mt-3 flex justify-between gap-3 text-xs opacity-60"><b>{displayName(item.profiles||{full_name:item.author_name})}</b><span>{new Date(item.created_at).toLocaleDateString()}</span></div></div></article>})}
      {!visible.length&&<p className="py-12 text-center opacity-55">No matching listings yet.</p>}
    </div><MobileBottomNav theme={theme} active="home" />
  </main>;
}
