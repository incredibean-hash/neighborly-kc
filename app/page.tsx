'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];

// compress image in browser to save your free storage
async function compressImage(file: File): Promise<File> {
  const img = document.createElement('img');
  const canvas = document.createElement('canvas');
  const dataUrl = await new Promise<string>(r=>{
    const reader = new FileReader(); reader.onload=()=>r(reader.result as string); reader.readAsDataURL(file);
  });
  await new Promise<void>(res=>{ img.onload=()=>res(); img.src=dataUrl; });
  const max = 1200;
  let {width, height} = img;
  if (width>max || height>max){
    if (width>height){ height = height*max/width; width=max; }
    else { width = width*max/height; height=max; }
  }
  canvas.width=width; canvas.height=height;
  canvas.getContext('2d')!.drawImage(img,0,0,width,height);
  const blob = await new Promise<Blob>(res=>canvas.toBlob(b=>res(b!), 'image/jpeg', 0.7));
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {type:'image/jpeg'});
}

export default function Page(){
  const [hoods,setHoods]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [hood,setHood]=useState('parkwood-hills');
  const [cat,setCat]=useState('All');
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [addr,setAddr]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);

  useEffect(()=>{ (async()=>{
    const {data:h}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false});
    if(h) setHoods(h);
    const {data:p}=await supabase.from('posts').select('*,profiles(full_name)').order('created_at',{ascending:false}).limit(50);
    if(p) setPosts(p);
    const s=typeof window!=='undefined'? localStorage.getItem('nkc_profile') : null;
    if(s) setProfile(JSON.parse(s));
  })() },[]);

  const cur = hoods.find((x:any)=>x.slug===hood) || hoods[0] || {name:'Parkwood Hills', zip:'64155', id: null, slug:'parkwood-hills', member_count: 247};
  const filtered = cat==='All'? posts : posts.filter((p:any)=>p.category===cat);

  const handlePost = async () => {
    if(!profile) return setShowJoin(true);
    if(!body.trim() &&!file) return;
    if(file){
      if(!file.type.startsWith('image/')){ alert('Images only!'); return; }
      if(file.size > 3*1024*1024){ alert('Max 3MB please - your file is '+(file.size/1024/1024).toFixed(1)+'MB'); return; }
    }

    setUploading(true);
    try{
      let image_url: string | null = null;
      if(file){
        const compressed = await compressImage(file);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const {error: upErr} = await supabase.storage.from('post-images').upload(path, compressed);
        if(upErr) throw upErr;
        const {data} = supabase.storage.from('post-images').getPublicUrl(path);
        image_url = data.publicUrl;
      }

      const realId = hoods.find((x:any)=>x.slug===hood)?.id || cur?.id;
      const { data, error } = await supabase.from('posts').insert({
        body: body,
        category: cat==='All'? 'General' : cat,
        neighborhood_id: realId,
        image_url,
      }).select().single();

      if(error) throw error;
      const newPost = {...data, profiles: { full_name: profile.full_name } };
      setPosts([newPost,...posts]);
      setBody(''); setFile(null);
      (document.getElementById('file-input') as any).value='';
    } catch(e:any){
      alert('Could not save: '+(e.message||e));
    } finally{ setUploading(false); }
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
            <div className="flex items-center gap-2 mt-3">
              <input id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs" />
              {file && <span className="text-xs opacity-60">{(file.size/1024).toFixed(0)}KB - will be compressed</span>}
            </div>
            <div className="flex justify-end mt-2"><button disabled={uploading} onClick={handlePost} className="bg-[#1a3a2f] text-white px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50">{uploading?'Uploading...':'Post to neighbors 📷'}</button></div>
            <p className="text- opacity-40 mt-2">Free hosting: 3MB max, jpg/png/webp only, auto-compressed to ~400KB to save your 1GB free tier</p>
          </div>

          {filtered.map((p:any)=><div key={p.id} className="bg-white rounded-2xl p-4 border"><p className="text-xs font-bold opacity-60">{p.profiles?.full_name||'Neighbor'} · {p.category}</p><p className="mt-1 whitespace-pre-wrap">{p.body || p.content}</p>{p.image_url && <img src={p.image_url} alt="post" className="mt-3 rounded-xl max-h- w-full object-cover border" />}<p className="text-xs opacity-40 mt-2">{new Date(p.created_at).toLocaleString()}</p></div>)}
        </main>

        <aside className="bg-white rounded-2xl p-5 border h-fit"><h3 className="font-black">{cur?.name}</h3><p className="text-xs opacity-60">{cur?.zip} · Kansas City, MO</p><div className="grid grid-cols-2 gap-2 mt-4"><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{cur?.member_count}</b><p className="text-xs">NEIGHBORS</p></div><div className="bg-[#f8f5ee] rounded-xl p-3 text-center"><b className="text-lg">{posts.length}</b><p className="text-xs">POSTS</p></div></div></aside>
      </div>

      {showJoin && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-sm p-6"><h2 className="font-black text-xl">Join {cur?.name}</h2><form onSubmit={e=>{e.preventDefault(); const pr={full_name:name,email,street_address:addr,zip:cur?.zip,neighborhood_id:cur?.id}; localStorage.setItem('nkc_profile',JSON.stringify(pr)); setProfile(pr); setShowJoin(false);}} className="mt-4 space-y-2"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><input required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><input required value={addr} onChange={e=>setAddr(e.target.value)} placeholder={`Address in ${cur?.zip}`} className="w-full bg-[#f8f5ee] border rounded-xl px-3 py-3 text-sm"/><div className="flex gap-2 pt-2"><button type="button" onClick={()=>setShowJoin(false)} className="flex-1 bg-[#f8f5ee] py-3 rounded-full font-bold text-sm">Cancel</button><button className="flex-1 bg-[#1a3a2f] text-white py-3 rounded-full font-bold text-sm">Join</button></div></form></div></div>}
    </div>
  );
}
