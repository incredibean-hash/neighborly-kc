'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const CATS=['General','Safety','For Sale'] as const;
const THEMES:any={
  midnight:{name:'Midnight 🌙', bg:'bg-black', card:'bg-[#1a1a1a]', text:'text-white', sub:'bg-white/10', btn:'bg-white text-black', dot:'bg-black'},
  daylight:{name:'Daylight ☀️', bg:'bg-[#f8f5ee]', card:'bg-white', text:'text-black', sub:'bg-black/5', btn:'bg-black text-white', dot:'bg-[#f8f5ee]'},
  kcblue:{name:'KC Blue 💙', bg:'bg-[#0a1931]', card:'bg-[#123456]', text:'text-white', sub:'bg-white/10', btn:'bg-[#ffcc00] text-black', dot:'bg-[#0a1931]'},
  sand:{name:'Warm Sand', bg:'bg-[#e8ddd0]', card:'bg-[#fff8ee]', text:'text-[#2b2b2b]', sub:'bg-black/5', btn:'bg-[#1a3a2f] text-white', dot:'bg-[#e8ddd0]'},
  aim:{name:'AIM 💬', bg:'bg-[#ffffcc]', card:'bg-white', text:'text-black', sub:'bg-[#ffcc00]/30', btn:'bg-[#0055ff] text-white', dot:'bg-[#ffffcc]'},
  pipboy:{name:'Pip-Boy 3000', bg:'bg-[#0a1a0a]', card:'bg-[#0f2a0f]', text:'text-[#00ff41]', sub:'bg-[#00ff41]/20', btn:'bg-[#00ff41] text-black', dot:'bg-[#0a1a0a]'},
};
const DEMO_POSTS=[
  {id:'demo1', author_name:'Sarah M', area:'Brookside', category:'For Sale', body:'Garage sale Sat 8am - 45th & Wornall!', created_at:new Date(Date.now()-1000*60*60*2).toISOString()},
  {id:'demo2', author_name:'Mike T', area:'North KC', category:'Safety', body:'Coyote spotted near 64th & N Oak last night', created_at:new Date(Date.now()-1000*60*30).toISOString()},
  {id:'demo3', author_name:'KC Parks', area:'Plaza', category:'General', body:'Free concert Mill Creek Park Fri 6pm!', created_at:new Date().toISOString()},
];

export default function Page(){
  const [profile,setProfile]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>(DEMO_POSTS);
  const [filter,setFilter]=useState<typeof CATS[number]>('General');
  const [theme,setTheme]=useState('midnight');
  const [showPost,setShowPost]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [settingsAnim,setSettingsAnim]=useState(false);
  const [text,setText]=useState('');
  const [cat,setCat]=useState<typeof CATS[number]>('General');
  const [photo,setPhoto]=useState<string|null>(null);
  const [dmTo,setDmTo]=useState('');
  const [showDM,setShowDM]=useState(false);
  const [dmMsg,setDmMsg]=useState('');
  const [dms,setDms]=useState<any[]>([]);
  const [viewedCats,setViewedCats]=useState<Record<string, string>>({});
  const [viewedDMs,setViewedDMs]=useState<Record<string, boolean>>({});
  const [newToast,setNewToast]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const scrollRef=useRef<HTMLDivElement>(null);
  const t=THEMES[theme];

  useEffect(()=>{
    const p=localStorage.getItem('nkc_profile'); if(p) setProfile(JSON.parse(p));
    const th=localStorage.getItem('nkc_theme'); if(th && THEMES[th]) setTheme(th);
    const vc=localStorage.getItem('nkc_viewed_cats'); if(vc) setViewedCats(JSON.parse(vc));
    const vd=localStorage.getItem('nkc_viewed_dms'); if(vd) setViewedDMs(JSON.parse(vd));
    load();
  },[]);
  useEffect(()=>{localStorage.setItem('nkc_theme',theme);},[theme]);
  useEffect(()=>{localStorage.setItem('nkc_viewed_cats',JSON.stringify(viewedCats));},[viewedCats]);
  useEffect(()=>{localStorage.setItem('nkc_viewed_dms',JSON.stringify(viewedDMs));},[viewedDMs]);
  useEffect(()=>{ if(showSettings) setTimeout(()=>setSettingsAnim(true),10); else setSettingsAnim(false); },[showSettings]);

  async function load(){
    try{
      const {data}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100);
      if(data && data.length>0){
        // keep demo posts but put real first so you SEE what you posted
        const merged=[...data,...DEMO_POSTS];
        setPosts(merged);
      }
    }catch{}
  }

  async function loadDMs(){
    try{
      const {data}=await supabase.from('dms').select('*').order('created_at',{ascending:false}).limit(50);
      if(data) setDms(data);
    }catch{}
  }

  function markCatViewed(c:string){
    const now=new Date().toISOString();
    setViewedCats(prev=>({...prev, [c]: now}));
    setFilter(c as any);
  }

  function markDMViewed(id:string){
    setViewedDMs(prev=>({...prev, [id]: true}));
  }

  function clearAllCatBadges(){
    const now=new Date().toISOString();
    const all:Record<string,string>={};
    CATS.forEach(c=>all[c]=now);
    setViewedCats(all);
  }

  async function doPost(){
    if(!text &&!photo) return;
    const newPost:any={
      id:'my-'+Date.now(),
      author_name:profile?.full_name||'You',
      area:profile?.zip? profile.zip+' Area' : 'KC Area',
      body:text, text:text, category:cat,
      image_url:photo, photo_url:photo,
      created_at:new Date().toISOString(),
      isMine:true
    };
    // Show instantly at top
    setPosts([newPost,...posts]);
    setFilter(cat); // switch to that category so you SEE it
    markCatViewed(cat); // clear badge since you just saw it
    setText(''); setPhoto(null); setShowPost(false);
    setNewToast(`Posted to ${cat}!`);
    setTimeout(()=>setNewToast(null),2500);
    try{
      await supabase.from('posts').insert({
        author_name:newPost.author_name, area:newPost.area, body:newPost.body, text:newPost.text,
        category:newPost.category, image_url:newPost.image_url, photo_url:newPost.photo_url
      });
    }catch{}
  }

  async function sendDM(){
    if(!dmTo||!dmMsg) return;
    await supabase.from('dms').insert({from_user:profile?.full_name||'You', to_user:dmTo, message:dmMsg, body:dmMsg});
    setDmMsg(''); loadDMs();
  }

  async function del(id:string){
    if(String(id).startsWith('demo')||String(id).startsWith('my-')||String(id).startsWith('temp')){
      setPosts(posts.filter((p:any)=>p.id!==id)); return;
    }
    await supabase.from('posts').delete().eq('id',id); load();
  }

  // NEW counts = posts created after last viewed time for that cat
  function newCountForCat(c:string){
    const last=viewedCats[c];
    if(!last) return posts.filter((p:any)=>p.category===c).length>0?1:0; // show 1 badge until first view
    return posts.filter((p:any)=>p.category===c && new Date(p.created_at).getTime() > new Date(last).getTime()).length;
  }

  const shown=posts.filter((p:any)=>p.category===filter);

  return(
    <div className={`h-[100dvh] w-screen overflow-hidden ${t.bg} ${t.text} flex flex-col overscroll-none select-none`}>
      <style>{`html,body{overscroll-behavior:none; overflow:hidden; position:fixed; width:100%; height:100dvh;} *{ -webkit-tap-highlight-color: transparent; }`}</style>

      {newToast&&<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-5 py-2.5 rounded-full font-bold shadow-2xl text-sm animate-bounce">{newToast}</div>}

      {/* HEADER - fixed, no scroll bar */}
      <div className={`${t.bg} border-b border-white/10 p-3 shrink-0 z-10`}>
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <div className="text-center flex-1">
            <div className="text-[17px] font-black tracking-widest">Neighborly KC</div>
            <div className="text-[10px] opacity-50">Kansas City • 40 Mile Radius</div>
          </div>
          <button onClick={()=>setShowSettings(true)} className={`ml-2 w-9 h-9 ${t.sub} rounded-full flex items-center justify-center text-lg shrink-0`}>⚙️</button>
        </div>

        {/* 3 CATEGORIES ONLY - CENTERED - NO SCROLL - BADGE CLEARS ON VIEW */}
        <div className="flex gap-2 mt-3 justify-center max-w-md mx-auto">
          {CATS.map((c)=>{
            const n=newCountForCat(c);
            return(
              <button key={c} onClick={()=>markCatViewed(c)} className={`relative px-5 py-2 rounded-full text-sm font-black transition-all ${filter===c? t.btn+' shadow-md' : t.sub}`}>
                {c}
                {n>0&&<span className="absolute -top-1.5 -right-1.5 bg-[#ff3b30] text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-black animate-pulse">{n>9?'9+':n}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* SCROLLABLE FEED - browser bar won't pop up */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain max-w-md mx-auto w-full p-3 space-y-3 pb-4" style={{WebkitOverflowScrolling:'touch'}}>
        {shown.length===0?(
          <div className={`${t.card} border border-white/10 rounded-2xl p-8 text-center mt-10`}>
            <div className="text-2xl mb-2">📭</div>
            <div className="font-bold">No posts in {filter} yet</div>
            <div className="text-xs opacity-60 mt-1">Be first to post!</div>
          </div>
        ): shown.map((p:any)=>(
          <div key={p.id} className={`${t.card} border ${p.isMine?'border-white/30 ring-1 ring-white/20':''} border-white/10 rounded-2xl p-4 w-full`}>
            <div className="flex justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[14px] truncate">{p.author_name} {p.isMine&&<span className="text-[10px] bg-white text-black px-2 py-0.5 rounded-full ml-1">YOU</span>}</div>
                <div className="text-[11px] opacity-50 truncate">{p.category} • {p.area}</div>
              </div>
              <button onClick={()=>del(p.id)} className="text-[11px] bg-white/10 text-white/60 px-3 py-1 rounded-full h-fit">✕</button>
            </div>
            <div className="mt-2.5 text-[14px] leading-snug break-words whitespace-pre-wrap">{p.body||p.text}</div>
            {(p.image_url||p.photo_url)&&<img src={p.image_url||p.photo_url} className="mt-3 rounded-xl w-full" alt=""/>}
            <button onClick={()=>{setDmTo(p.author_name); setShowDM(true); loadDMs();}} className={`mt-3 w-full ${t.btn} py-2.5 rounded-full font-black text-sm`}>DM {String(p.author_name).split(' ')[0]}</button>
          </div>
        ))}
        <div className="h-2"></div>
      </div>

      {/* BOTTOM NAV */}
      <div className={`${t.bg} border-t border-white/10 flex justify-around items-center py-2.5 max-w-md mx-auto w-full shrink-0`}>
        <button onClick={()=>{ clearAllCatBadges(); window.scrollTo(0,0); scrollRef.current?.scrollTo({top:0, behavior:'smooth'}); }} className="text-[11px] font-bold opacity-60 px-4 py-2">Clear badges</button>
        <button onClick={()=>setShowPost(true)} className={`${t.btn} w-14 h-14 rounded-full font-black text-2xl shadow-xl flex items-center justify-center`}>+</button>
        <button onClick={()=>{loadDMs(); setShowDM(true);}} className="text-[11px] font-bold relative px-4 py-2">
          DM {dms.filter((d:any)=>!viewedDMs[d.id]).length>0&&<span className="absolute -top-1 right-0 bg-[#ff3b30] w-2.5 h-2.5 rounded-full animate-pulse"></span>}
        </button>
      </div>

      {showSettings&&(
        <div className={`fixed inset-0 z-30 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${settingsAnim?'bg-black/60 backdrop-blur-sm':'bg-black/0'}`} onClick={()=>setShowSettings(false)}>
          <div onClick={(e)=>e.stopPropagation()} className={`${t.card} w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl p-6 border border-white/10 ${t.text} shadow-2xl transition-all duration-500 ${settingsAnim?'translate-y-0 opacity-100':'translate-y-full opacity-0'}`}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black">Settings</h2>
              <button onClick={()=>setShowSettings(false)} className={`w-8 h-8 ${t.sub} rounded-full`}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(THEMES).map((k:any)=>{
                const th=THEMES[k];
                return <button key={k} onClick={()=>setTheme(k)} className={`p-3 rounded-2xl border-2 text-left ${theme===k?'border-white':'border-black/10'} ${th.card} ${th.text}`}><div className={`w-6 h-6 rounded-full ${th.dot} mb-1 border`}></div><div className="font-bold text-xs">{th.name}</div></button>;
              })}
            </div>
            <button onClick={()=>setShowSettings(false)} className={`w-full mt-5 ${t.btn} py-3 rounded-full font-black`}>Done</button>
          </div>
        </div>
      )}

      {showPost&&(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`${t.card} w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl p-5 border border-white/10 ${t.text} shadow-2xl`}>
            <h2 className="font-bold text-center mb-3">New Post</h2>
            <div className="flex gap-2 mb-3 justify-center">
              {CATS.map((c)=><button key={c} onClick={()=>setCat(c)} className={`px-4 py-2 rounded-full text-sm font-black ${cat===c? t.btn : t.sub}`}>{c}</button>)}
            </div>
            <textarea value={text} onChange={(e)=>setText(e.target.value)} placeholder={`Post to ${cat}... you'll see it instantly`} className={`w-full ${t.bg} border border-white/20 rounded-xl p-3 text-[15px] min-h-[110px] ${t.text} w-full`} autoFocus/>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={()=>fileRef.current?.click()} className={`w-10 h-10 ${t.sub} rounded-full flex items-center justify-center text-xl`}>+</button>
              <span className="text-[11px] opacity-60">Add photo</span>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e)=>{const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setPhoto(r.result as string); r.readAsDataURL(f);}}/>
            </div>
            {photo&&<img src={photo} className="mt-3 rounded-xl w-full" alt=""/>}
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowPost(false)} className={`flex-1 py-3 rounded-full ${t.sub} font-bold text-sm`}>Cancel</button>
              <button onClick={doPost} className={`flex-1 py-3 rounded-full ${t.btn} font-black`}>Post</button>
            </div>
          </div>
        </div>
      )}

      {showDM&&(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`${t.card} w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl p-5 border border-white/10 max-h-[85dvh] overflow-auto ${t.text} shadow-2xl w-full`}>
            <h2 className="font-bold text-center mb-3">Messages</h2>
            <input value={dmTo} onChange={(e)=>setDmTo(e.target.value)} placeholder="To: Full Name" className={`w-full ${t.bg} border border-white/10 rounded-full px-4 py-2.5 mb-2 text-sm ${t.text} w-full`}/>
            <textarea value={dmMsg} onChange={(e)=>setDmMsg(e.target.value)} placeholder="Message" className={`w-full ${t.bg} border border-white/10 rounded-xl p-3 text-sm mb-2 min-h-[70px] ${t.text} w-full`}/>
            <button onClick={sendDM} className={`w-full ${t.btn} py-3 rounded-full font-black text-sm mb-4`}>Send DM</button>
            <div className="space-y-2">
              {dms.map((m:any)=>{
                const isNew=!viewedDMs[m.id];
                return(
                  <div key={m.id} onClick={()=>{setDmTo(m.from_user); markDMViewed(m.id);}} className={`${t.sub} p-3 rounded-xl text-sm cursor-pointer relative ${isNew?'ring-1 ring-[#ff3b30]/50':''}`}>
                    {isNew&&<span className="absolute top-2 right-2 bg-[#ff3b30] text-white text-[9px] font-black px-2 py-0.5 rounded-full">NEW</span>}
                    <b className="text-xs">{m.from_user} → {m.to_user}</b>
                    <div className="mt-1 opacity-80 text-xs break-words pr-8">{m.message||m.body}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={()=>setShowDM(false)} className={`w-full mt-4 py-2.5 rounded-full ${t.sub} font-bold text-sm`}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
