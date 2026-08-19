'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, displayName, authorizeRealtime } from '../../lib/community';
import { useAppTheme } from '../../lib/use-theme';
import MobileBottomNav from '../components/MobileBottomNav';

function DmsContent(){
 const theme=useAppTheme();
 const params=useSearchParams(); const target=params.get('user');
 const [me,setMe]=useState<any>(null),[people,setPeople]=useState<any[]>([]),[messages,setMessages]=useState<any[]>([]),[selected,setSelected]=useState<string|null>(target),[text,setText]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[errorText,setErrorText]=useState('');
 const [unread,setUnread]=useState<Record<string,number>>({});
 const [pushState,setPushState]=useState<'checking'|'unsupported'|'off'|'on'|'blocked'>('checking');
 const [pushMessage,setPushMessage]=useState('');
 // The realtime handler must read the *current* selection without being torn
 // down and resubscribed every time the user switches conversations.
 const selectedRef=useRef<string|null>(target);
 const meRef=useRef<any>(null);
 const bottomRef=useRef<HTMLDivElement|null>(null);
 const threadRef=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{selectedRef.current=selected},[selected]);
 useEffect(()=>{meRef.current=me},[me]);
 useEffect(()=>{
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){setPushState('unsupported');return;}
  if(Notification.permission==='denied'){setPushState('blocked');return;}
  if(!me){setPushState('checking');return;}
  navigator.serviceWorker.register('/sw.js').then(async registration=>{
   const subscription=await registration.pushManager.getSubscription();
   if(!subscription){setPushState('off');return;}
   // A browser may remember its local subscription after a previous server
   // save failed or after the person switches accounts. Re-sync it every time
   // a signed-in account opens Messages.
   const {data:{session}}=await supabase.auth.getSession();
   const response=await fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify(subscription.toJSON())});
   if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error||'Subscription sync failed');}
   setPushState('on');
   setPushMessage('Message alerts are enabled on this device.');
  }).catch(e=>{setPushState('off');setPushMessage(e?.message||'Tap Enable alerts to reconnect this device.');});
 },[me]);
 const enablePush=async()=>{
  try{
   setPushMessage('');
   setPushState('checking');
   if(!me)throw new Error('Sign in before enabling message alerts.');
   if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){setPushState('unsupported');throw new Error('This browser does not support push alerts. On iPhone, open NeighborlyKC from its Home Screen icon.');}
   const permission=await Notification.requestPermission();
   if(permission!=='granted'){setPushState(permission==='denied'?'blocked':'off');throw new Error(permission==='denied'?'Notifications are blocked in this device’s settings.':'Notification permission was not granted.');}
   const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
   if(!publicKey)throw new Error('Push alerts are not configured yet.');
   const registration=await navigator.serviceWorker.register('/sw.js');
   await navigator.serviceWorker.ready;
   let subscription=await registration.pushManager.getSubscription();
   // Recreate a remembered subscription so it always uses the VAPID key from
   // the current deployment (important after keys were regenerated).
   if(subscription)await subscription.unsubscribe();
   subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(publicKey)});
   const {data:{session}}=await supabase.auth.getSession();
   const response=await fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session?.access_token||''}`},body:JSON.stringify(subscription.toJSON())});
   if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||'Could not enable alerts.');
   setPushState('on');
   setPushMessage('Message alerts are enabled on this device.');
  }catch(e:any){
   if(typeof Notification==='undefined')setPushState('unsupported');
   else if(Notification.permission==='denied')setPushState('blocked');
   else setPushState('off');
   setPushMessage(e.message||'Could not enable alerts.');
  }
 };
 const load=async()=>{
  setLoading(true);setErrorText('');
  // getSession() reads persisted storage without a network round trip, so a
  // slow/failed /user call can no longer show "Sign in to use Messages" to an
  // already signed-in neighbor.
  const {data:{session}}=await supabase.auth.getSession();
  const user=session?.user||null;
  setMe(user);meRef.current=user;
  if(!user){setLoading(false);return;}
  await authorizeRealtime();
  let {data:p,error}=await supabase.from('profiles').select('auth_user_id,full_name,email,zip,avatar_url').not('auth_user_id','is',null).neq('auth_user_id',user.id).order('full_name');
  if(error){
   const fallback=await supabase.from('profiles').select('auth_user_id,full_name,email,zip').not('auth_user_id','is',null).neq('auth_user_id',user.id).order('full_name');
   p=(fallback.data||[]).map((x:any)=>({...x,avatar_url:null}));error=fallback.error;
  }
  if(error){setErrorText(error.message);setPeople([])}
  else{
   let list=p||[];
   // A neighbor reached via /dms?user=<id> may be missing from the list (for
   // example an older profile row); fetch them so the header is not "Neighbor".
   if(target&&target!==user.id&&!list.some((x:any)=>x.auth_user_id===target)){
    const {data:one}=await supabase.from('profiles').select('auth_user_id,full_name,email,zip,avatar_url').eq('auth_user_id',target).maybeSingle();
    if(one)list=[one,...list];
   }
   setPeople(list);
  }
  setLoading(false);
 };
 const loadMessages=async(id:string)=>{
  const user=meRef.current;if(!user)return;
  setSelected(id);selectedRef.current=id;setErrorText('');
  setUnread(u=>({...u,[id]:0}));
  const {data,error}=await supabase.from('dms').select('*').or(`and(from_user_id.eq.${user.id},to_user_id.eq.${id}),and(from_user_id.eq.${id},to_user_id.eq.${user.id})`).order('created_at',{ascending:true});
  if(error){setErrorText(/from_user_id|to_user_id/.test(error.message)?'Messages need the latest Neighborly KC database fix. Run supabase_batch_fixes.sql in Supabase SQL Editor.':error.message);setMessages([]);return;}
  setMessages(data||[]);
 };
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(me&&target)loadMessages(target)},[me,target]);
 // Subscribe once per signed-in user. The previous version resubscribed on
 // every conversation switch, which regularly dropped live messages mid-handshake.
 useEffect(()=>{
  if(!me)return;
  let ch:any=null;
  let cancelled=false;
  (async()=>{
   // Realtime enforces RLS using the socket JWT. Without setAuth the dms table
   // delivers no events at all and messages only appear after a refresh.
   await authorizeRealtime();
   if(cancelled)return;
   ch=supabase.channel(`nkc-dms-${me.id}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'dms'},payload=>{
     const m:any=payload.new;
     const active=selectedRef.current;
     const involvesMe=m.from_user_id===me.id||m.to_user_id===me.id;
     if(!involvesMe)return;
     const partner=m.from_user_id===me.id?m.to_user_id:m.from_user_id;
     if(partner===active)setMessages(x=>x.some(y=>y.id===m.id)?x:[...x,m]);
     else if(m.to_user_id===me.id)setUnread(u=>({...u,[partner]:(u[partner]||0)+1}));
    })
    .subscribe();
  })();
  // Keep the socket token fresh so long sessions do not go quiet after a refresh.
  const {data:authSub}=supabase.auth.onAuthStateChange((_e,sess)=>{
   if(sess?.access_token)supabase.realtime.setAuth(sess.access_token);
  });
  return()=>{cancelled=true;authSub.subscription.unsubscribe();if(ch)supabase.removeChannel(ch)};
 },[me]);
 // Keep the newest message in view.
 useEffect(()=>{
  const thread=threadRef.current;
  if(!thread)return;
  window.requestAnimationFrame(()=>{thread.scrollTop=thread.scrollHeight;});
 },[messages.length,selected]);
 const current=useMemo(()=>people.find(p=>p.auth_user_id===selected),[people,selected]);
 const send=async()=>{
  if(!me||!selected||sending)return;
  const message=text.trim();
  if(!message)return;
  setSending(true);setErrorText('');
  const {data,error}=await supabase.from('dms').insert({from_user_id:me.id,to_user_id:selected,message,body:message}).select().single();
  if(error){
   setErrorText(/row-level security/i.test(error.message)?'Messages are blocked by the database policy. Run supabase_batch_fixes.sql in Supabase SQL Editor.':error.message);
  } else {
   setMessages(x=>x.some(y=>y.id===data.id)?x:[...x,data]);
   setText('');
   const {data:{session}}=await supabase.auth.getSession();
   if(session?.access_token)void fetch('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({messageId:data.id})}).catch(()=>{});
  }
  setSending(false);
 };
 if(loading)return <main className="min-h-screen grid place-items-center" style={{backgroundColor:theme.bg,color:theme.text}}>Loading…</main>;
 if(!me)return <main className="min-h-screen grid place-items-center" style={{backgroundColor:theme.bg,color:theme.text}}><div className="text-center"><p className="font-bold">Sign in to use Messages.</p><Link href="/" className="underline">Back to Neighborly KC</Link></div></main>;
 const border={borderColor:theme.border};
 return <main className="min-h-screen w-full overflow-x-hidden nkc-subpage-with-nav" style={{backgroundColor:theme.bg,color:theme.text}}>
  <header className="nkc-subpage-header nkc-messages-header p-4" style={{backgroundColor:theme.header,color:'#fff'}}><div className="max-w-4xl mx-auto nkc-messages-header-row"><div className="min-w-0"><Link href="/" className="text-xs opacity-70">← Feed</Link><h1 className="font-black text-2xl">Messages</h1></div><div className="nkc-messages-header-actions"><button type="button" disabled={pushState==='checking'||pushState==='on'||pushState==='unsupported'} onClick={enablePush} className="rounded-full px-3 py-2 text-xs font-bold whitespace-nowrap disabled:opacity-70" style={{backgroundColor:theme.card,color:theme.accent,border:`1px solid ${theme.border}`}}>{pushState==='checking'?'Connecting…':pushState==='on'?'🔔 Alerts on':pushState==='blocked'?'🔕 Blocked':pushState==='unsupported'?'Alerts unavailable':'🔔 Enable alerts'}</button><Link href="/people" className="rounded-full px-3 sm:px-4 py-2 text-sm font-bold whitespace-nowrap" style={{backgroundColor:theme.card,color:theme.accent,border:`1px solid ${theme.border}`}}>Find People</Link></div></div>{pushMessage&&<div role="status" className="max-w-4xl mx-auto mt-2 rounded-xl px-3 py-2 text-xs font-bold" style={{backgroundColor:'rgba(255,255,255,.14)'}}>{pushMessage}</div>}</header>
  <div className="w-full max-w-4xl mx-auto p-3 sm:p-4 grid md:grid-cols-[280px_minmax(0,1fr)] gap-4 min-w-0">
   <aside className={`rounded-2xl p-3 ${selected?'hidden md:block':''}`} style={{backgroundColor:theme.card,...border}}><p className="text-xs font-bold opacity-50 px-2 pb-2">NEIGHBORS</p>{!people.length?<p className="p-3 text-sm opacity-50">No other members yet.</p>:people.map(p=><button key={p.auth_user_id} onClick={()=>loadMessages(p.auth_user_id)} className="w-full text-left rounded-xl p-3 flex items-center gap-3 min-w-0" style={selected===p.auth_user_id?{backgroundColor:theme.accent,color:theme.pillTextActive}:{}}><span className="nkc-person-avatar" style={{backgroundColor:theme.input}}>{p.avatar_url?<img src={p.avatar_url} alt=""/>:displayName(p).slice(0,1).toUpperCase()}</span><span className="min-w-0 flex-1"><b className="block text-sm truncate">{displayName(p)}</b><span className="block text-xs opacity-60 truncate">Kansas City{p.zip?` • ${p.zip}`:''}</span></span>{!!unread[p.auth_user_id]&&<span className="inline-flex items-center justify-center text-[10px] font-black rounded-full px-2 py-0.5" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{unread[p.auth_user_id]}</span>}</button>)}</aside>
   <section className={`nkc-message-panel rounded-2xl min-h-[520px] flex flex-col min-w-0 overflow-hidden ${selected?'':'hidden md:flex'}`} style={{backgroundColor:theme.card,...border}}>
    {selected?<><div className="p-3 sm:p-4 border-b flex items-center gap-2 sm:gap-3 min-w-0" style={border}><button className="md:hidden shrink-0 text-sm font-bold" onClick={()=>setSelected(null)}>←</button><span className="nkc-person-avatar" style={{backgroundColor:theme.input}}>{current?.avatar_url?<img src={current.avatar_url} alt=""/>:displayName(current).slice(0,1).toUpperCase()}</span><Link href={`/profile/${selected}`} className="font-black hover:underline truncate">{displayName(current)}</Link><p className="text-xs opacity-50 truncate">Private conversation</p></div><div ref={threadRef} className="flex-1 p-3 sm:p-4 space-y-2 overflow-y-auto min-w-0 overscroll-contain">{errorText&&<div className="rounded-xl p-3 text-sm" style={{backgroundColor:theme.input,color:theme.text}}>{errorText}</div>}{messages.map(m=>{const mine=m.from_user_id===me.id;return <div key={m.id} className={`flex items-end gap-2 ${mine?'justify-end':''}`}>{!mine&&<span className="nkc-message-avatar" style={{backgroundColor:theme.input}}>{current?.avatar_url?<img src={current.avatar_url} alt=""/>:displayName(current).slice(0,1).toUpperCase()}</span>}<div className="max-w-[82%] rounded-2xl px-4 py-2 break-words overflow-hidden" style={{backgroundColor:mine?theme.accent:theme.input,color:mine?theme.pillTextActive:theme.text}}><p className="break-words">{m.message||m.body}</p><p className="text-[10px] opacity-50 mt-1">{new Date(m.created_at).toLocaleString()}</p></div></div>})}{!messages.length&&<p className="text-center opacity-40 py-16">Start the conversation.</p>}<div ref={bottomRef} /></div><div className="p-2 sm:p-3 border-t flex gap-2 min-w-0" style={border}><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}} placeholder={`Message ${displayName(current)}...`} className="nkc-themed-input min-w-0 flex-1 rounded-full px-3 sm:px-4 py-3 outline-none" style={{backgroundColor:theme.input,color:theme.text,border:`1px solid ${theme.border}`}}/><button disabled={sending} onClick={send} className="shrink-0 rounded-full px-4 sm:px-5 font-bold" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{sending?'...':'Send'}</button></div></>:<div className="flex-1 grid place-items-center p-10 text-center opacity-50">Select a neighbor to start a conversation.</div>}
   </section>
  </div>
  <MobileBottomNav theme={theme}/>
 </main>;
}

function urlBase64ToUint8Array(value:string){
 const padding='='.repeat((4-value.length%4)%4);
 const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
 const raw=window.atob(base64);
 return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

export default function DmsPage(){
  return <Suspense fallback={<main className="min-h-screen grid place-items-center bg-[#f0f6ff] text-[#00205a]">Loading…</main>}><DmsContent /></Suspense>;
}
