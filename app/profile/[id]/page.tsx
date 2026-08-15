'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase, displayName } from '../../../lib/community';
import { useAppTheme } from '../../../lib/use-theme';

export default function ProfilePage(){
  const theme=useAppTheme();
  const params=useParams<{id:string}>();
  const id=params.id;
  const [p,setP]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [me,setMe]=useState<any>(null);
  const [conn,setConn]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(false);
  const [name,setName]=useState('');
  const [zip,setZip]=useState('');
  const [saving,setSaving]=useState(false);

  const load=async()=>{
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    setMe(user);
    const {data:pr,error:prErr}=await supabase.from('profiles').select('auth_user_id,full_name,email,zip,street_address,is_verified,is_founder,is_admin').eq('auth_user_id',id).maybeSingle();
    if(prErr) console.error(prErr);
    setP(pr);
    setName(pr?.full_name||'');
    setZip(pr?.zip||'');
    const {data:po}=await supabase.from('posts').select('id,body,category,created_at,image_url,neighborhood_id').eq('user_id',id).order('created_at',{ascending:false}).limit(20);
    setPosts(po||[]);
    if(user&&user.id!==id){
      const {data:c}=await supabase.from('connections').select('*').or(`and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`).maybeSingle();
      setConn(c);
    }
    setLoading(false);
  };
  useEffect(()=>{load()},[id]);

  const connect=async()=>{
    if(!me)return window.location.href='/';
    const {error}=await supabase.from('connections').insert({requester_id:me.id,addressee_id:id,status:'pending'});
    if(error)alert(error.message);
    await load();
  };

  const saveProfile=async()=>{
    if(!me||me.id!==id||!name.trim())return;
    setSaving(true);
    const {data,error}=await supabase.from('profiles').update({full_name:name.trim(),zip:zip.trim()}).eq('auth_user_id',id).select('auth_user_id,full_name,email,zip,street_address,is_verified,is_founder,is_admin').single();
    if(error){alert('Could not save profile: '+error.message);setSaving(false);return;}
    setP(data);setEditing(false);
    localStorage.setItem('nkc_profile',JSON.stringify({...data,user_id:id}));
    setSaving(false);
  };

  if(loading)return <main className="min-h-screen grid place-items-center" style={{backgroundColor:theme.bg,color:theme.text}}>Loading…</main>;
  if(!p && me?.id===id)return <main className="min-h-screen grid place-items-center p-6" style={{backgroundColor:theme.bg,color:theme.text}}><div className="w-full max-w-md rounded-3xl p-7 text-center border" style={{backgroundColor:theme.card,borderColor:theme.border}}><div className="mx-auto mb-4 w-16 h-16 rounded-full grid place-items-center text-2xl font-black" style={{backgroundColor:theme.input}}>KC</div><p className="text-xl font-black">Your profile isn't published yet.</p><p className="text-sm opacity-60 mt-2">Finish your Neighborly KC profile first, then you can view the public version here.</p><Link href="/profile" className="inline-flex mt-5 rounded-full px-5 py-3 font-bold" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>Create / Edit Profile</Link><Link href="/" className="block mt-3 text-sm font-bold opacity-60">← Back to Feed</Link></div></main>;
  if(!p)return <main className="min-h-screen grid place-items-center p-6" style={{backgroundColor:theme.bg,color:theme.text}}><div className="text-center"><p className="font-bold">Neighbor not found.</p><Link href="/people" className="inline-flex mt-4 rounded-full px-5 py-2.5 font-bold" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>← Back to People</Link></div></main>;

  const status=conn?.status;
  const isOwner=me?.id===id;
  const border={borderColor:theme.border};
  return <main className="min-h-screen" style={{backgroundColor:theme.bg,color:theme.text}}>
    <header className="sticky top-0 z-20 overflow-hidden border-b" style={{backgroundColor:theme.header,borderColor:theme.border,color:'#fff'}}>
      <div className="relative h-24 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-14 opacity-70 pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 900 100" className="w-full h-full" preserveAspectRatio="none"><path d="M0 78h55V52h22v26h38V34h18v44h40V62h22v16h34V48h20v30h37V22h13v56h34V39h25v39h32V15h14v63h35V44h20v34h40V28h12v50h33V55h22v23h35V35h16v43h38V50h19v28h41V20h12v58h36V42h23v36h42V60h18v18h44V37h20v41h34V52h22v26h54v-78H0Z" fill={theme.accent} opacity=".25"/></svg>
        </div>
        <div className="relative z-10 max-w-3xl mx-auto p-4 flex items-center justify-between gap-3">
          <Link href="/people" className="text-xs opacity-75">← People</Link>
          {isOwner&&<span className="text-xs font-black rounded-full px-3 py-1 bg-white/10 border border-white/20">Your profile</span>}
        </div>
      </div>
    </header>

    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <section className="rounded-3xl p-6 border nkc-surface" style={{backgroundColor:theme.card,borderColor:theme.border}}>
        {!editing?<div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="w-20 h-20 shrink-0 rounded-full grid place-items-center text-3xl font-black border-2" style={{backgroundColor:theme.input,borderColor:theme.border}}>{displayName(p).slice(0,1).toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><h1 className="text-3xl font-black">{displayName(p)}</h1>{(p.is_admin||p.is_founder)&&<span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase" style={{backgroundColor:theme.input}}>Admin</span>}{p.is_verified&&<span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase" style={{backgroundColor:theme.input}}>Verified</span>}</div>
            <p className="opacity-60 mt-1">📍 Kansas City {p.zip?`• ${p.zip}`:''}</p>
            <p className="text-sm mt-3 opacity-70">Neighborly KC member</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isOwner?<button onClick={()=>setEditing(true)} className="rounded-full px-4 py-2 font-bold" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>✏️ Edit Profile</button>:<>{status==='accepted'?<span className="rounded-full border px-4 py-2 font-bold" style={border}>Connected</span>:status==='pending'&&conn?.requester_id===me?.id?<span className="rounded-full px-4 py-2 font-bold" style={{backgroundColor:theme.input}}>Pending</span>:status==='pending'?<Link href="/connections" className="rounded-full px-4 py-2 font-bold" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>Respond</Link>:<button onClick={connect} className="rounded-full px-4 py-2 font-bold" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>Connect</button>}<Link href={`/dms?user=${id}`} className="rounded-full border px-4 py-2 font-bold" style={border}>Message</Link></>}
          </div>
        </div>:<div className="space-y-4">
          <div className="flex items-center gap-4"><div className="w-16 h-16 rounded-full grid place-items-center text-2xl font-black" style={{backgroundColor:theme.input}}>{name.trim().slice(0,1).toUpperCase()||'N'}</div><div><h2 className="text-xl font-black">Edit your profile</h2><p className="text-xs opacity-60">Keep it simple. Your street address stays private.</p></div></div>
          <label className="block"><span className="text-xs font-black uppercase opacity-60">Name</span><input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-xl border px-4 py-3 outline-none" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}} /></label>
          <label className="block"><span className="text-xs font-black uppercase opacity-60">ZIP code</span><input value={zip} onChange={e=>setZip(e.target.value)} inputMode="numeric" maxLength={10} className="mt-1 w-full rounded-xl border px-4 py-3 outline-none" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}} /></label>
          <div className="flex gap-2 justify-end"><button onClick={()=>{setEditing(false);setName(p.full_name||'');setZip(p.zip||'')}} className="px-4 py-2.5 rounded-full font-bold" style={{backgroundColor:theme.input}}>Cancel</button><button disabled={saving||!name.trim()} onClick={saveProfile} className="px-5 py-2.5 rounded-full font-bold disabled:opacity-50" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{saving?'Saving…':'Save Profile'}</button></div>
        </div>}
        <div className="grid grid-cols-2 gap-3 mt-6"><div className="rounded-2xl p-4" style={{backgroundColor:theme.input}}><b className="text-xl">{posts.length}</b><p className="text-xs opacity-60">Posts</p></div><div className="rounded-2xl p-4" style={{backgroundColor:theme.input}}><b className="text-xl">{status==='accepted'?1:0}</b><p className="text-xs opacity-60">Connection</p></div></div>
      </section>

      <section><div className="flex items-center justify-between mb-3"><h2 className="font-black text-xl">Recent posts</h2>{!isOwner&&<Link href="/" className="text-xs font-bold opacity-60 hover:opacity-100">Back to feed</Link>}</div>{!posts.length?<div className="rounded-2xl p-8 text-center opacity-60 border" style={{backgroundColor:theme.card,borderColor:theme.border}}>No posts yet.</div>:posts.map(x=><article key={x.id} className="rounded-2xl p-4 mb-3 border nkc-surface" style={{backgroundColor:theme.card,borderColor:theme.border}}><p className="text-xs font-bold opacity-60">{x.category}</p><p className="mt-1 whitespace-pre-wrap">{x.body}</p>{x.image_url&&<img src={x.image_url} alt="Post by neighbor" className="mt-3 rounded-xl max-h-96 w-full object-cover"/>}<p className="text-xs opacity-40 mt-3">{new Date(x.created_at).toLocaleString()}</p></article>)}</section>
    </div>
  </main>;
}
