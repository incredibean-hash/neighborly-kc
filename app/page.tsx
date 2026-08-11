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
  {author_name:'Sarah M', area:'Brookside Area', category:'For Sale', body:'Garage sale Sat 8am - 45th & Wornall!', created_at:new Date().toISOString()},
  {author_name:'Mike T', area:'North KC Area', category:'Safety', body:'Coyote spotted near 64th & N Oak', created_at:new Date().toISOString()},
  {author_name:'KC Parks', area:'Plaza Area', category:'General', body:'Free concert Mill Creek Park Fri 6pm!', created_at:new Date().toISOString()},
];

export default function Page(){
  const [profile,setProfile]=useState<any>(null);
  const [posts,setPosts]=useState<any[]>([]);
  const [filter,setFilter]=useState('All');
  const [feedRadius,setFeedRadius]=useState('40 miles - All KC');
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
  const fileRef=useRef<HTMLInputElement>(null);
  const t=THEMES[theme];

  useEffect(()=>{
    const p=localStorage.getItem('nkc_profile'); if(p) setProfile(JSON.parse(p));
    const th=localStorage.getItem('nkc_theme'); if(th && THEMES[th]) setTheme(th);
    load();
  },[]);
  useEffect(()=>{localStorage.setItem('nkc_theme',theme);},[theme]);
  useEffect(()=>{if(showSettings){ setTimeout(()=>setSettingsAnim(true),10); } else setSettingsAnim(false);},[showSettings]);
  async function load(){const {data}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100); if(data&&data.length>0)setPosts(data); else setPosts(DEMO_POSTS as any);}
  async function loadDMs(){const {data}=await supabase.from('dms').select('*').order('created_at',{ascending:false}).limit(50); if(data)setDms(data);}
  async function doPost(){if(!text&&!photo)return; await supabase.from('posts').insert({author_name:profile?.full_name||'Neighbor',zip:profile?.zip||'64155',area:profile? profile.zip+' Area':'KC Area',body:text,text:text,category:cat,reach:reach,image_url:photo,photo_url:photo}); setText('');setPhoto(null);setShowPost(false);load();}
  async function sendDM(){if(!dmTo||!dmMsg)return; await supabase.from('dms').insert({from_user:profile?.full_name||'You',to_user:dmTo,message:dmMsg,body:dmMsg}); setDmMsg(''); loadDMs();}
  async function del(id:string){await supabase.from('posts').delete().eq('id',id); load();}
  const isAdmin=profile&&profile.full_name.toLowerCase().includes('bean');
  const shown=filter==='All'?posts:posts.filter((p:any)=>p.category===filter);

  return(
    <div className={`min-h-screen ${t.bg} ${t.text} pb-24 transition-all duration-500 ease-in-out ${t.text.includes('00ff41')?'font-mono tracking-wider':''}`}>
      <style>{`* { transition: background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease; } button, select, textarea, input { transition: all 0.2s ease; } button:active { transform: scale(0.96); }`}</style>
      {theme==='pipboy'&&<div className="pointer-events-none fixed inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,255,65,0.05),rgba(0,255,65,0.05)_1px,transparent_2px)] z-0"></div>}

      <div className={`sticky top-0 ${t.bg} border-b ${theme==='pipboy'?'border-[#00ff41]/30':'border-white/10'} p-4 z-10 transition-all duration-500`}>
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="text-center flex-1">
            <div className="text-xl font-black tracking-widest">Neighborly KC</div>
            <div className="text-[11px] mt-1 opacity-50">Kansas City • 40 Mile Radius</div>
          </div>
          <button onClick={()=>setShowSettings(true)} className={`ml-3 w-10 h-10 ${t.sub} rounded-full flex items-center justify-center text-xl hover:scale-110 transition-transform duration-200`}>⚙️</button>
        </div>
        <div className="flex gap-3 mt-4 justify-center max-w-md mx-auto">
          <button onClick={()=>setFilter('All')} className={`px-6 py-2.5 rounded-full text-sm font-black transition-all duration-300 hover:scale-105 ${filter==='All'? t.btn+' shadow-lg' : t.sub}`}>All</button>
          {CATS.map(c=><button key={c} onClick={()=>setFilter(c)} className={`px-6 py-2.5 rounded-full text-sm font-black transition-all duration-300 hover:scale-105 ${filter===c? t.btn+' shadow-lg' : t.sub}`}>{c}</button>)}
        </div>
        <div className="flex justify-center mt-3">
          <select value={feedRadius} onChange={e=>setFeedRadius(e.target.value)} className={`${t.card} border border-white/10 rounded-full px-4 py-1.5 text-xs ${t.text}`}>
            {REACH.map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4 relative z-10">
        {shown.map((p:any, idx:number)=>(
          <div key={p.id||idx} className={`${t.card} border border-white/10 rounded-2xl p-5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1`} style={{animation:`fadeIn 0.5s ease ${idx*0.05}s both`}}>
            <div className="flex justify-between">
              <div>
                <div className="font-bold text-base">{p.author_name}</div>
                <div className="text-xs opacity-50 mt-1">{p.category} • {p.area||'KC Area'} {p.reach? '• '+p.reach : ''}</div>
              </div>
              {(p.id && profile&&(profile.full_name===p.author_name||isAdmin))&&<button onClick={()=>del(p.id)} className="text-xs bg-red-900/60 text-white px-4 py-1 rounded-full h-fit">Delete</button>}
            </div>
            <div className="mt-3 text-[15px] leading-relaxed">{p.body||p.text}</div>
            {(p.image_url||p.photo_url)&&<img src={p.image_url||p.photo_url} className="mt-4 rounded-xl w-full"/>}
            <button onClick={()=>{setDmTo(p.author_name); setShowDM(true); loadDMs();}} className={`mt-4 w-full ${t.btn} py-3 rounded-full font-black text-sm hover:shadow-lg hover:scale-[1.02] transition-all`}>DM {p.author_name.split(' ')[0]}</button>
          </div>
        ))}
      </div>

      <div className={`fixed bottom-0 left-0 right-0 ${t.bg} border-t border-white/10 flex justify-around items-center py-4 max-w-md mx-auto z-10 transition-all duration-500 backdrop-blur-lg bg-opacity-90`}>
        <button className="text-sm font-bold">Home</button>
        <button onClick={()=>setShowPost(true)} className={`${t.btn} w-14 h-14 rounded-full font-black text-2xl shadow-lg hover:scale-105 transition-all`}>+</button>
        <button onClick={()=>{loadDMs();setShowDM(true);}} className="text-sm font-bold">DM</button>
      </div>

      {showSettings&&(
        <div className={`fixed inset-0 z-30 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${settingsAnim?'bg-black/60 backdrop-blur-sm':'bg-black/0'}`} onClick={()=>setShowSettings(false)}>
          <div onClick={e=>e.stopPropagation()} className={`${t.card} w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl p-6 border border-white/10 ${t.text} shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${settingsAnim?'translate-y-0 opacity-100':'translate-y-full sm:translate-y-8 opacity-0'}`}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden"></div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-lg">Settings</h2>
              <button onClick={()=>setShowSettings(false)} className={`w-8 h-8 ${t.sub} rounded-full hover:rotate-90 transition-all duration-300`}>✕</button>
            </div>

            <div className="mb-6">
              <div className="text-sm font-bold mb-3 opacity-70">Theme — always readable</div>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(THEMES).map((k:any,i)=>{
                  const th=THEMES[k];
                  return(
                    <button key={k} onClick={()=>setTheme(k)} className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-lg ${theme===k? 'border-white scale-[1.02] shadow-lg' : 'border-black/10'} ${th.card} ${th.text}`} style={{transitionDelay:`${i*30}ms`}}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-full border-black/10 shadow-inner ${th.dot}`}></div>
                        <div className={`w-3 h-3 rounded-full ${th.btn.split(' ')[0]}`}></div>
                      </div>
                      <div className={`font-bold text-sm ${th.text}`}>{th.name}</div>
                      <div className={`text-[11px] mt-1 font-bold transition-all duration-300 ${theme===k?'opacity-100':'opacity-0'} ${th.text}`}>{theme===k?'✓ Active':'.'}</div>
                    </button>
                  )
                })}
              </div>
              <div className="text-[11px] opacity-50 mt-3 text-center">Each card shows its own true colors — no more invisible text</div>
            </div>

            <button onClick={()=>setShowSettings(false)} className={`w-full ${t.btn} py-3.5 rounded-full font-black hover:shadow-lg active:scale-[0.98] transition-all`}>Done</button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {showPost&&<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-end sm:items-center justify-center p-0 sm:p-4"><div className={`${t.card} w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl p-6 border border-white/10 ${t.text} shadow-2xl`}>
        <h2 className="font-bold text-lg text-center mb-4">New Post</h2>
        <div className="flex gap-3 mb-4 justify-center">{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-5 py-2.5 rounded-full text-sm font-black ${cat===c? t.btn : t.sub}`}>{c}</button>)}</div>
        <div className="mb-4"><div className="text-xs opacity-50 mb-2 text-center">How far?</div><select value={reach} onChange={e=>setReach(e.target.value)} className={`w-full ${t.bg} border border-white/10 rounded-full px-5 py-3 text-sm ${t.text}`}>{REACH.map(r=><option key={r}>{r}</option>)}</select></div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Whats happening in KC?" className={`w-full ${t.bg} border border-white/10 rounded-xl p-4 text-base min-h-[100px] ${t.text}`}/>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={()=>fileRef.current?.click()} className={`w-12 h-12 ${t.sub} rounded-full flex items-center justify-center text-2xl font-black`}>+</button>
          <span className="text-xs opacity-50">Add photo</span>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files&&e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>setPhoto(r.result as string); r.readAsDataURL(f);}}/>
        </div>
        {photo&&<img src={photo} className="mt-4 rounded-xl w-full"/>}
        <div className="flex gap-3 mt-6"><button onClick={()=>setShowPost(false)} className={`flex-1 py-3 rounded-full ${t.sub} font-bold`}>Cancel</button><button onClick={doPost} className={`flex-1 py-3 rounded-full ${t.btn} font-black`}>Post to {reach}</button></div>
      </div></div>}

      {showDM&&<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-end sm:items-center justify-center p-0 sm:p-4"><div className={`${t.card} w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl p-6 border border-white/10 max-h-[85vh] overflow-auto ${t.text} shadow-2xl`}>
        <h2 className="font-bold text-lg text-center mb-4">Messages</h2>
        <input value={dmTo} onChange={e=>setDmTo(e.target.value)} placeholder="To: Full Name" className={`w-full ${t.bg} border border-white/10 rounded-full px-5 py-3 mb-3 text-base ${t.text}`}/>
        <textarea value={dmMsg} onChange={e=>setDmMsg(e.target.value)} placeholder="Message" className={`w-full ${t.bg} border border-white/10 rounded-xl p-4 text-base mb-3 min-h-[80px] ${t.text}`}/>
        <button onClick={sendDM} className={`w-full ${t.btn} py-4 rounded-full font-black text-base mb-6`}>Send DM</button>
        <div className="text-xs opacity-50 mb-2">Recent — tap to reply</div>
        <div className="space-y-2">{dms.map((m:any)=><div key={m.id} onClick={()=>{setDmTo(m.from_user===profile?.full_name? m.to_user : m.from_user);}} className={`${t.sub} p-3 rounded-xl text-sm cursor-pointer`}><b>{m.from_user} → {m.to_user}</b><div className="mt-1 opacity-80">{m.message||m.body}</div></div>)}</div>
        <button onClick={()=>setShowDM(false)} className={`w-full mt-6 py-3 rounded-full ${t.sub} font-bold`}>Close</button>
      </div></div>}
    </div>
  );
}
