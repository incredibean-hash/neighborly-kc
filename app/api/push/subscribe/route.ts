export const dynamic='force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req:Request){
 try{
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
  if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
  const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
  const {data:{user}}=await anon.auth.getUser(token);
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const subscription=await req.json();
  const endpoint=String(subscription?.endpoint||''),p256dh=String(subscription?.keys?.p256dh||''),auth=String(subscription?.keys?.auth||'');
  if(!endpoint.startsWith('https://')||!p256dh||!auth)return NextResponse.json({error:'Invalid push subscription'},{status:400});
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  const {error}=await admin.from('push_subscriptions').upsert({user_id:user.id,endpoint,p256dh,auth,user_agent:req.headers.get('user-agent')||null,updated_at:new Date().toISOString()},{onConflict:'user_id,endpoint'});
  if(error)throw error;
  return NextResponse.json({subscribed:true});
 }catch(e:any){return NextResponse.json({error:e.message||'Subscription failed'},{status:500});}
}
