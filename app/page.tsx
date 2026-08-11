'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const CATS=['General','Safety','For Sale'];
const REACH=['ZIP Only','5 miles','10 miles','25 miles','40 miles - All KC'];
const THEMES:any={
  midnight:{name:'Midnight 🌙', bg:'bg-black', card:'bg-[#1a1a1a]', text:'text-white', sub:'bg-white/10', btn:'bg-white text-black', accent:''},
  daylight:{name:'Daylight ☀️', bg:'bg-[#f8f5ee]', card:'bg-white', text:'text-black', sub:'bg-black/5', btn:'bg-black text-white', accent:''},
  kcblue:{name:'KC Blue 💙', bg:'bg-[#0a1931]', card:'bg-[#123456]', text:'text-white', sub:'bg-white/10', btn:'bg-[#ffcc00] text-black', accent:''},
  sand:{name:'Warm Sand', bg:'bg-[#e8ddd0]', card:'bg-[#fff8ee]', text:'text-[#2b2b2b]', sub:'bg-black/5', btn:'bg-[#1a3a2f] text-white', accent:''},
  aim:{name:'AIM 💬', bg:'bg-[#ffffcc]', card:'bg-white', text:'text-black', sub:'bg-[#ffcc00]/30', btn:'bg-[#0055ff] text-white', accent:'aim'},
  pipboy:{name:'Pip-Boy 3000', bg:'bg-[#0a1a0a]', card:'bg-[#0f2a0f]', text:'text-[#00ff41]', sub:'bg-[#00ff41]/20', btn:'bg-[#00ff41] text-black', accent:'pip'},
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
  async function load(){const {data}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(100); if(data&&data.length>0)setPosts(data); else setPosts(DEMO_POSTS as any);}
  async function loadDMs(){const {data}=await supabase.from('dms').select('*').order('created_at',{ascending:false}).limit(50); if(data)setDms(data);}
  async function doPost(){if(!text&&!photo)return; await supabase.from('posts').insert({author_name:profile?.full_name||'Neighbor',zip:profile?.zip||'64155',area:profile? profile.zip+' Area':'KC Area',body:text,text:text,category:cat,reach:reach,image_url:photo,photo_url:photo}); setText('');setPhoto(null);setShowPost(false);load();}
  async function sendDM(){if(!dmTo||!dmMsg)return; await supabase.from('dms').insert({from_user:profile?.full_name||'You',to_user:dmTo,message:dmMsg,body:dmMsg}); setDmMsg(''); loadDMs();}
  async function del(id:string){await supabase.from('posts').delete().eq('id',id); load();}
  const isAdmin=profile&&profile.full_name.toLowerCase().includes('bean');
  const shown=filter==='All'?posts:posts.filter((p:any)=>p.category===filter);

  return(
    <div className={`min-h-screen ${t.bg} ${t.text} pb-24 ${t.accent==='pip'?'font-mono':''} ${t.accent==='pip'?'tracking-wider':''}`}>
      {t.accent==='pip'&&<div className="pointer-events-none fixed inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,255,65,0.05),rgba(0,255,65,0.05)_1px,transparent_2px)] z-0"></div>}
      {t.accent==='aim'&&<style>{`@import url('https://fonts.googleapis.com/css2?family=MS+Sans+Serif');`}</style>}

      <div className={`sticky top-0 ${t.bg} border-b ${t.accent==='pip'?'border-[#00ff41]/30':'border-white/10'} p-4 z-10`}>
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="text-center flex-1">
            <div className={`text-xl font-black tracking-widest ${t.accent==='aim'?'font-mono bg-[#0055ff] text-white inline-block px-3 py-1 border-2 border-black':''} ${t.accent==='pip'?'text-[#00ff41]':''}`}>
              {t.accent==='aim'?'Neighborly KC - Buddy List': t.accent==='pip'?'ROBCO INDUSTRIES - Neighborly KC':'Neighborly KC'}
            </div>
            <div className={`text-[11px] mt-1 ${t.accent==='pip'?'text-[#00ff41]/70':'opacity-50'}`}>{t.accent==='pip'?'// KC WASTELAND NETWORK v1.0':'Kansas City • 40 Mile Radius'}</div>
          </div>
          <button onClick={()=>setShowSettings(true)} className={`ml-3 w-10 h-10 ${t.sub} rounded-full flex items-center justify-center text-xl`}>⚙️</button>
        </div>

        <div className="flex gap-3 mt-4 justify-center max-w-md mx-auto">
          <button onClick={()=>setFilter('All')} className={`px-6 py-2.5 rounded-full text-sm font-black ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${filter==='All'? t.btn : t.sub}`}>All</button>
          {CATS.map(c=><button key={c} onClick={()=>setFilter(c)} className={`px-6 py-2.5 rounded-full text-sm font-black ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'border border-[#00ff41]':''} ${filter===c? t.btn : t.sub}`}>{c}</button>)}
        </div>

        <div className="flex justify-center mt-3">
          <select value={feedRadius} onChange={e=>setFeedRadius(e.target.value)} className={`${t.card} border ${t.accent==='pip'?'border-[#00ff41]/50':'border-white/10'} rounded-full px-4 py-1.5 text-xs ${t.text} ${t.accent==='aim'?'rounded-none border-2 border-black':''}`}>
            {REACH.map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4 relative z-10">
        {shown.map((p:any, idx:number)=>(
          <div key={p.id||idx} className={`${t.card} border ${t.accent==='pip'?'border-[#00ff41]/30':'border-white/10'} ${t.accent==='aim'?'rounded-none border-2 border-black shadow-[4px_4px_0px_black]':'rounded-2xl'} p-5`}>
            <div className="flex justify-between">
              <div>
                <div className={`font-bold text-base ${t.accent==='aim'?'underline':''} ${t.accent==='pip'?'before:content-["▶_"]':''}`}>{p.author_name}</div>
                <div className="text-xs opacity-50 mt-1">{p.category} • {p.area||'KC Area'} {p.reach? '• '+p.reach : ''}</div>
              </div>
              {(p.id && profile&&(profile.full_name===p.author_name||isAdmin))&&<button onClick={()=>del(p.id)} className="text-xs bg-red-900/60 text-white px-4 py-1 rounded-full h-fit">Delete</button>}
            </div>
            <div className={`mt-3 text-[15px] ${t.accent==='pip'?'font-mono':''}`}>{p.body||p.text}</div>
            {(p.image_url||p.photo_url)&&<img src={p.image_url||p.photo_url} className={`mt-4 w-full ${t.accent==='aim'?'rounded-none border-2 border-black':'rounded-xl'} ${t.accent==='pip'?'grayscale sepia hue-rotate-60 contrast-125':''}`}/>}
            <button onClick={()=>{setDmTo(p.author_name); setShowDM(true); loadDMs();}} className={`mt-4 w-full ${t.btn} py-3 font-black text-sm ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''} rounded-full`}>
              {t.accent==='aim'?'IM '+p.author_name.split(' ')[0]: t.accent==='pip'?'[ TRANSMIT ]':'DM '+p.author_name.split(' ')[0]}
            </button>
          </div>
        ))}
      </div>

      <div className={`fixed bottom-0 left-0 right-0 ${t.bg} border-t ${t.accent==='pip'?'border-[#00ff41]/30':'border-white/10'} flex justify-around items-center py-4 max-w-md mx-auto z-10`}>
        <button className="text-sm font-bold">Home</button>
        <button onClick={()=>setShowPost(true)} className={`${t.btn} w-14 h-14 rounded-full font-black text-2xl ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>+</button>
        <button onClick={()=>{loadDMs();setShowDM(true);}} className="text-sm font-bold">DM</button>
      </div>

      {showSettings&&<div className="fixed inset-0 bg-black/80 z-30 flex items-center justify-center p-4">
        <div className={`${t.card} w-full max-w-sm rounded-2xl p-6 border border-white/10 ${t.text} ${t.accent==='aim'?'rounded-none border-2 border-black shadow-[6px_6px_0px_black]':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-black text-lg">{t.accent==='pip'?'SYSTEM SETTINGS':'Settings'}</h2>
            <button onClick={()=>setShowSettings(false)} className={`w-8 h-8 ${t.sub} rounded-full`}>✕</button>
          </div>
          <div className="mb-6">
            <div className="text-sm font-bold mb-3">{t.accent==='pip'?'SELECT THEME MODULE':'Theme'}</div>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(THEMES).map((k:any)=><button key={k} onClick={()=>setTheme(k)} className={`p-4 rounded-xl border-2 text-left ${theme===k? 'border-white' : 'border-transparent'} ${THEMES[k].card} ${THEMES[k].accent==='aim'?'rounded-none border-black border-2':''} ${THEMES[k].accent==='pip'?'rounded-none border-[#00ff41]/50':''}`}>
                <div className={`w-8 h-8 rounded-full mb-2 ${THEMES[k].bg} border border-white/20`}></div>
                <div className="font-bold text-sm">{THEMES[k].name}</div>
                {theme===k&&<div className="text-[10px] mt-1 opacity-60">✓ Active</div>}
              </button>)}
            </div>
          </div>
          <button onClick={()=>setShowSettings(false)} className={`w-full ${t.btn} py-3 rounded-full font-black ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>Done</button>
        </div>
      </div>}

      {showPost&&<div className="fixed inset-0 bg-black/80 z-20 flex items-center justify-center p-4"><div className={`${t.card} w-full max-w-sm rounded-2xl p-6 border border-white/10 ${t.text} ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>
        <h2 className="font-bold text-lg text-center mb-4">{t.accent==='aim'?'Post a Message': t.accent==='pip'?'BROADCAST':'New Post'}</h2>
        <div className="flex gap-3 mb-4 justify-center">{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-5 py-2.5 rounded-full text-sm font-black ${cat===c? t.btn : t.sub} ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>{c}</button>)}</div>
        <div className="mb-4"><div className="text-xs opacity-50 mb-2 text-center">How far should this go?</div><select value={reach} onChange={e=>setReach(e.target.value)} className={`w-full ${t.bg} border border-white/10 rounded-full px-5 py-3 text-sm ${t.text} ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>{REACH.map(r=><option key={r}>{r}</option>)}</select></div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={t.accent==='aim'?'heyyy whats up?':'Whats happening in KC?'} className={`w-full ${t.bg} border border-white/10 rounded-xl p-4 text-base min-h-[100px] ${t.text} ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]/50 font-mono':''}`}/>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={()=>fileRef.current?.click()} className={`w-12 h-12 ${t.sub} rounded-full flex items-center justify-center text-2xl font-black ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>+</button>
          <span className="text-xs opacity-50">Add photo</span>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files&&e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>setPhoto(r.result as string); r.readAsDataURL(f);}}/>
        </div>
        {photo&&<img src={photo} className="mt-4 rounded-xl w-full"/>}
        <div className="flex gap-3 mt-6"><button onClick={()=>setShowPost(false)} className={`flex-1 py-3 rounded-full ${t.sub} font-bold ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>Cancel</button><button onClick={doPost} className={`flex-1 py-3 rounded-full ${t.btn} font-black ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>Post</button></div>
      </div></div>}

      {showDM&&<div className="fixed inset-0 bg-black/80 z-20 flex items-center justify-center p-4"><div className={`${t.card} w-full max-w-sm rounded-2xl p-6 border border-white/10 max-h-[80vh] overflow-auto ${t.text} ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>
        <h2 className="font-bold text-lg text-center mb-4">{t.accent==='aim'?'Instant Message':'Messages'}</h2>
        <input value={dmTo} onChange={e=>setDmTo(e.target.value)} placeholder="To: Full Name" className={`w-full ${t.bg} border border-white/10 rounded-full px-5 py-3 mb-3 text-base ${t.text} ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]/50':''}`}/>
        <textarea value={dmMsg} onChange={e=>setDmMsg(e.target.value)} placeholder="Message" className={`w-full ${t.bg} border border-white/10 rounded-xl p-4 text-base mb-3 min-h-[80px] ${t.text} ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]/50':''}`}/>
        <button onClick={sendDM} className={`w-full ${t.btn} py-4 rounded-full font-black text-base mb-6 ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>Send</button>
        <div className="text-xs opacity-50 mb-2">Recent — tap to reply</div>
        <div className="space-y-2">{dms.map((m:any)=><div key={m.id} onClick={()=>{setDmTo(m.from_user===profile?.full_name? m.to_user : m.from_user);}} className={`${t.sub} p-3 rounded-xl text-sm cursor-pointer`}><b>{m.from_user} → {m.to_user}</b><div className="mt-1 opacity-80">{m.message||m.body}</div></div>)}</div>
        <button onClick={()=>setShowDM(false)} className={`w-full mt-6 py-3 rounded-full ${t.sub} font-bold ${t.accent==='aim'?'rounded-none border-2 border-black':''} ${t.accent==='pip'?'rounded-none border border-[#00ff41]':''}`}>Close</button>
      </div></div>}
    </div>
  );
}
