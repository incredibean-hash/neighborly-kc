'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const CATS=['General','Safety','For Sale'];
const REACH=['ZIP Only','5 miles','10 miles','25 miles','40 miles - All KC'];
const THEMES:any={
  midnight:{name:'Midnight 🌙', bg:'bg-black', card:'bg-[#1a1a1a]', text:'text-white', sub:'bg-white/10', btn:'bg-white text-black', dot:'bg-black'},
  daylight:{name:'Daylight ☀️', bg:'bg-[#f8f5ee]', card:'bg-white', text:'text-black', sub:'bg-black/5', btn:'bg-black text-white', dot:'bg-[#f8f5ee]'},
  kcblue:{name:'KC Blue 💙', bg:'bg-[#0a1931]', card:'bg-[#123456]', text:'text-white', sub:'bg-white/10', btn:'bg-[#ffcc00] text-black', dot:'bg-[#0a1931]'},
  sand:{name:'Warm Sand', bg:'bg-[#e8ddd0]', card:'bg-[#fff8ee]', text:'text-[#2b2b2b]', sub:'bg-black/5', btn:'bg-[#1a3a2f] text-white', dot:'bg-[#e8ddd0]'},
  aim:{name:'AIM 💬', bg:'bg-[#ffffcc]', card:'bg-white', text:'text-black', sub:'bg-[#ffcc00]/30', btn:'bg-[#0055ff] text-white', dot:'bg-[#ffffcc]'},
  pipboy:{name:'Pip-Boy 3000', bg:'bg-[#0a1a0a]', card:'bg-[#0f2a0f]', text:'text-[#00ff41]', sub:'bg-[#00ff41]/20', btn:'bg-[#00ff41] text-black', dot:'bg-[#0a1a0a]'},
};
const DEMO_POSTS=[
  {id:'demo1', author_name:'Sarah M', area:'Brookside Area', category:'For Sale', body:'Garage sale Sat 8am - 45th & Wornall, lots of baby stuff + furniture!', created_at:new Date().toISOString()},
  {id:'demo2', author_name:'Mike T', area:'North KC Area', category:'Safety', body:'Heads up - coyote spotted near 64th & N Oak last night', created_at:new Date().toISOString()},
  {id:'demo3', author_name:'KC Parks', area:'Plaza Area', category:'General', body:'Free concert in Mill Creek Park this Friday 6pm!', created_at:new Date().toISOString()},
];

export default function Page(){
  const [profile,setProfile]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>(DEMO_POSTS);
  const [filter,setFilter]=useState('All');
  const [theme,setTheme]=useState('midnight');
  const [showPost,setShowPost]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [settingsAnim,setSettingsAnim]=useState(false);
  const [text,setText]=useState('');
  const [cat,setCat]=useState('General');
  const [reach,setReach]=useState('10 miles');
  const [photo,setPhoto]=useState<string|null>(null);
  const [dmTo,setDmTo]=useState('');
  const [showDM,setShowDM]=useState(false);
  const [dmMsg,setDmMsg]=useState('');
  const [dms,setDms]=useState<any[]>([]);
  const [unread,setUnread]=useState(0);
  const [lastDmCount,setLastDmCount]=useState(0);
  const [newDmToast,setNewDmToast]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const t=THEMES[theme];

  useEffect(()=>{
    const p=localStorage.getItem('nkc_profile'); if(p) setProfile(JSON.parse(p));
    const th=localStorage.getItem('nkc_theme'); if(th && THEMES[th]) setTheme(th);
    load(); loadDMs();
    const iv=setInterval(()=>loadDMs(),10000);
    return()=>clearInterval(iv);
  },[]);
  useEffect(()=>{localStorage.setItem('nkc_theme',theme);},[theme]);
  useEffect(()=>{ if(showSettings){ setTimeout(()=>setSettingsAnim(true),10); } else setSettingsAnim(false); },[showSettings]);

  async function load(){
    try{
      const {data}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100);
      if(data && data.length>0){ setPosts([...data,...DEMO_POSTS]); }
    }catch{}
  }
  async function loadDMs(){
    try{
      const {data}=await supabase.from('dms').select('*').order('created_at',{ascending:false}).limit(50);
      if(!data) return;
      setDms(data);
      const me=JSON.parse(localStorage.getItem('nkc_profile')||'{}')?.full_name;
      const myDMs=me? data.filter((d:any)=>d.to_user===me) : [];
      if(myDMs.length>lastDmCount && lastDmCount!==0){
        setNewDmToast(`New DM from ${myDMs[0].from_user}!`);
        setTimeout(()=>setNewDmToast(null),4000);
      }
      setLastDmCount(myDMs.length);
      setUnread(me? myDMs.length : 0);
    }catch{}
  }
  async function doPost(){
    if(!text&&!photo) return;
    const newPost={author_name:profile?.full_name||'You', zip:profile?.zip||'64155', area:profile? profile.zip+' Area':'KC Area', body:text, text:text, category:cat, reach:reach, image_url:photo, photo_url:photo, id:'temp-'+Date.now(), created_at:new Date().toISOString()};
    setPosts([newPost as any,...posts]);
    setText(''); setPhoto(null); setShowPost(false);
    try{ await supabase.from('posts').insert({author_name:newPost.author_name, zip:newPost.zip, area:newPost.area, body:newPost.body, text:newPost.text, category:newPost.category, reach:newPost.reach, image_url:newPost.image_url, photo_url:newPost.photo_url}); load(); }catch{}
  }
  async function sendDM(){ if(!dmTo||!dmMsg) return; await supabase.from('dms').insert({from_user:profile?.full_name||'You',to_user:dmTo,message:dmMsg,body:dmMsg}); setDmMsg(''); loadDMs(); }
  async function del(id:string){ if(String(id).startsWith('demo')||String(id).startsWith('temp')){ setPosts(posts.filter((p:any)=>p.id!==id)); return; } await supabase.from('posts').delete().eq('id',id); load(); }

  const shown=filter==='All'?posts:posts.filter((p:any)=>p.category===filter);

  return(
    <div className={`min-h-screen ${t.bg} ${t.text} pb-28 transition-all duration-500`}>
      <style>{`* { transition: background-color 0.3s ease, color 0.3s ease; }`}</style>

      {newDmToast&&(
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#ff3b30] text-white px-6 py-3 rounded-full font-bold shadow-2xl text-sm">
          {newDmToast}
        </div>
      )}

      <div className={`sticky top-0 ${t.bg} border-b border-white/10 p-3 z-10`}>
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <div className="text-center flex-1">
            <div className="text-lg font-black tracking-widest">Neighborly KC</div>
            <div className="text-[10px] opacity-50">Kansas City • 40 Mile Radius</div>
          </div>
          <button onClick={()=>setShowSettings(true)} className={`ml-2 w-9 h-9 ${t.sub} rounded-full flex items-center justify-center text-lg shrink-0`}>⚙️</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 justify-center max-w-md mx-auto">
          <button onClick={()=>setFilter('All')} className={`px-5 py-2 rounded-full text-sm font-black ${filter==='All'? t.btn : t.sub}`}>All ({posts.length})</button>
          {CATS.map((c)=>{
            const count=posts.filter((p:any)=>p.category===c).length;
            return <button key={c} onClick={()=>setFilter(c)} className={`px-5 py-2 rounded-full text-sm font-black ${filter===c? t.btn : t.sub}`}>{c} ({count})</button>;
          })}
        </div>
      </div>

      <div className="max-w-md mx-auto p-3 space-y-3 w-full min-h-[60vh]">
        <div className="text-xs opacity-50 text-center py-1">Showing {shown.length} posts • {filter}</div>
        {shown.map((p:any, idx:number)=>(
          <div key={p.id||idx} className={`${t.card} border border-white/10 rounded-2xl p-4 w-full`}>
            <div className="flex justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[15px] truncate">{p.author_name}</div>
                <div className="text-[11px] opacity-50 mt-1 truncate">{p.category} • {p.area||'KC Area'} {p.reach? '• '+p.reach : ''}</div>
              </div>
              <button onClick={()=>del(p.id)} className="text-[11px] bg-red-900/60 text-white px-3 py-1 rounded-full h-fit shrink-0">Delete</button>
            </div>
            <div className="mt-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap">{p.body||p.text}</div>
            {(p.image_url||p.photo_url)&&<img src={p.image_url||p.photo_url} className="mt-3 rounded-xl w-full" alt="post"/>}
            <button onClick={()=>{setDmTo(p.author_name); setShowDM(true); loadDMs();}} className={`mt-3 w-full ${t.btn} py-3 rounded-full font-black text-sm`}>DM {String(p.author_name).split(' ')[0]}</button>
          </div>
        ))}
      </div>

      <div className={`fixed bottom-0 left-0 right-0 ${t.bg} border-t border-white/20 flex justify-around items-center py-3 max-w-md mx-auto z-20 shadow-2xl`}>
        <button onClick={()=>{setFilter('All'); window.scrollTo({top:0, behavior:'smooth'});}} className="text-xs font-bold px-4 py-2">Home</button>
        <button onClick={()=>setShowPost(true)} className={`${t.btn} w-14 h-14 rounded-full font-black text-2xl shadow-xl flex items-center justify-center`}>+</button>
        <button onClick={()=>{loadDMs(); setShowDM(true); setUnread(0);}} className="text-xs font-bold relative px-4 py-2">
          DM {unread>0&&<span className="absolute -top-1 -right-1 bg-[#ff3b30] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">{unread>9?'9+':unread}</span>}
        </button>
      </div>

      {showSettings&&(
        <div className={`fixed inset-0 z-30 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${settingsAnim?'bg-black/60 backdrop-blur-sm':'bg-black/0'}`} onClick={()=>setShowSettings(false)}>
          <div onClick={(e)=>e.stopPropagation()} className={`${t.card} w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl p-6 border border-white/10 ${t.text} shadow-2xl transition-all duration-500 ${settingsAnim?'translate-y-0 opacity-100':'translate-y-full opacity-0'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-lg">Settings</h2>
              <button onClick={()=>setShowSettings(false)} className={`w-8 h-8 ${t.sub} rounded-full`}>✕</button>
            </div>
            <div className="mb-6">
              <div className="text-sm font-bold mb-3 opacity-70">Theme</div>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(THEMES).map((k:any)=>{
                  const th=THEMES[k];
                  return(
                    <button key={k} onClick={()=>setTheme(k)} className={`p-4 rounded-2xl border-2 text-left ${theme===k?'border-white':'border-black/10'} ${th.card} ${th.text}`}>
                      <div className={`w-8 h-8 rounded-full ${th.dot} mb-2 border`}></div>
                      <div className="font-bold text-sm">{th.name}</div>
                      <div className="text-[11px] mt-1">{theme===k?'✓ Active':''}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={()=>setShowSettings(false)} className={`w-full ${t.btn} py-3.5 rounded-full font-black`}>Done</button>
          </div>
        </div>
      )}

      {showPost&&(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`${t.card} w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl p-6 border border-white/10 ${t.text} shadow-2xl`}>
            <h2 className="font-bold text-lg text-center mb-4">New Post</h2>
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {CATS.map((c)=><button key={c} onClick={()=>setCat(c)} className={`px-5 py-2 rounded-full text-sm font-black ${cat===c? t.btn : t.sub}`}>{c}</button>)}
            </div>
            <div className="mb-4">
              <div className="text-xs opacity-50 mb-2 text-center">How far?</div>
              <select value={reach} onChange={(e)=>setReach(e.target.value)} className={`w-full ${t.bg} border border-white/10 rounded-full px-5 py-3 text-sm ${t.text} w-full`}>
                {REACH.map((r)=><option key={r}>{r}</option>)}
              </select>
            </div>
            <textarea value={text} onChange={(e)=>setText(e.target.value)} placeholder="Whats happening in KC?" className={`w-full ${t.bg} border-2 border-white/20 rounded-xl p-4 text-base min-h-[120px] ${t.text} w-full`} autoFocus/>
            <div className="flex items-center gap-3 mt-4">
              <button onClick={()=>fileRef.current?.click()} className={`w-12 h-12 ${t.sub} rounded-full flex items-center justify-center text-2xl font-black`}>+</button>
              <span className="text-xs opacity-60">Add photo</span>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e)=>{const f=e.target.files&&e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setPhoto(r.result as string); r.readAsDataURL(f);}}/>
            </div>
            {photo&&<img src={photo} className="mt-4 rounded-xl w-full" alt="preview"/>}
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setShowPost(false)} className={`flex-1 py-3 rounded-full ${t.sub} font-bold`}>Cancel</button>
              <button onClick={doPost} className={`flex-1 py-3 rounded-full ${t.btn} font-black text-base`}>Post Now →</button>
            </div>
          </div>
        </div>
      )}

      {showDM&&(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className={`${t.card} w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl p-6 border border-white/10 max-h-[85vh] overflow-auto ${t.text} shadow-2xl w-full`}>
            <h2 className="font-bold text-lg text-center mb-4">Messages</h2>
            <input value={dmTo} onChange={(e)=>setDmTo(e.target.value)} placeholder="To: Full Name" className={`w-full ${t.bg} border border-white/10 rounded-full px-5 py-3 mb-3 text-base ${t.text} w-full`}/>
            <textarea value={dmMsg} onChange={(e)=>setDmMsg(e.target.value)} placeholder="Message" className={`w-full ${t.bg} border border-white/10 rounded-xl p-4 text-base mb-3 min-h-[80px] ${t.text} w-full`}/>
            <button onClick={sendDM} className={`w-full ${t.btn} py-4 rounded-full font-black text-base mb-6`}>Send DM</button>
            <div className="text-xs opacity-50 mb-2">Recent — tap to reply</div>
            <div className="space-y-2">
              {dms.map((m:any)=>(
                <div key={m.id} onClick={()=>{setDmTo(m.from_user===profile?.full_name? m.to_user : m.from_user);}} className={`${t.sub} p-3 rounded-xl text-sm cursor-pointer break-words`}>
                  <b>{m.from_user} → {m.to_user}</b>
                  <div className="mt-1 opacity-80 break-words">{m.message||m.body}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>{setShowDM(false); setUnread(0);}} className={`w-full mt-6 py-3 rounded-full ${t.sub} font-bold`}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
