import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if(VAPID_PUBLIC && VAPID_PRIVATE){
  webpush.setVapidDetails('mailto:hello@neighborly-kc.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: NextRequest){
  try{
    const { to, from, message } = await req.json();
    if(!to) return NextResponse.json({error:'no to'}, {status:400});
    const { data } = await supabase.from('push_subscriptions').select('*').eq('user_name', to).single();
    if(!data?.subscription) return NextResponse.json({ok:true, note:'no sub for user'});
    const payload = JSON.stringify({ title: `DM from ${from}`, body: message?.slice(0,100) || 'New message' });
    await webpush.sendNotification(data.subscription, payload);
    return NextResponse.json({ok:true});
  }catch(e:any){
    console.error('push send error', e);
    return NextResponse.json({error:e.message}, {status:200}); // don't fail DM if push fails
  }
}
