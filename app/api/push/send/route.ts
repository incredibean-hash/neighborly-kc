
export const dynamic='force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const webpush=require('web-push');

export async function POST(req:Request){
 try{
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
  if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
  const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
  const {data:{user}}=await anon.auth.getUser(token);
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {messageId}=await req.json();
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  const {data:message}=await admin.from('dms').select('id,from_user_id,to_user_id,message,body,created_at').eq('id',String(messageId||'')).maybeSingle();
  if(!message||message.from_user_id!==user.id)return NextResponse.json({error:'Message not found'},{status:404});
  if(Date.now()-new Date(message.created_at).getTime()>10*60*1000)return NextResponse.json({error:'Message is too old'},{status:400});
  const [{data:sender},{data:subscriptions}]=await Promise.all([
   admin.from('profiles').select('full_name').eq('auth_user_id',user.id).maybeSingle(),
   admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id',message.to_user_id)
  ]);
  if(!subscriptions?.length)return NextResponse.json({skipped:true,reason:'recipient has no push subscription'});
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY;
  if(!publicKey||!privateKey)return NextResponse.json({error:'Push is not configured'},{status:503});
  webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:admin@neighborlykc.com',publicKey,privateKey);
  const senderName=sender?.full_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'A neighbor';
  const payload=JSON.stringify({title:`Message from ${senderName}`,body:String(message.message||message.body||'New message').slice(0,140),url:`/dms?user=${user.id}`,tag:`dm-${user.id}`});
  let sent=0;
  await Promise.all(subscriptions.map(async(s:any)=>{
   try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},payload,{TTL:3600});sent++;}
   catch(e:any){if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',s.id);else console.error('push send error',e);}
  }));
  await admin.from('notifications').insert({user_id:message.to_user_id,type:'message',message:`${senderName} sent you a message`});
  return NextResponse.json({sent});
 }catch(e:any){console.error('push route error',e);return NextResponse.json({error:e.message||'Push failed'},{status:500});}
}
