import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest){
  try{
    const { to, from, message } = await req.json();
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data } = await supabase.from('push_subscriptions').select('*').eq('user_name', to).single();
    if(!data?.subscription) return NextResponse.json({ok:true});

    // @ts-ignore
    const webpush = require('web-push');
    webpush.setVapidDetails('mailto:hello@neighborly-kc.com', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    await webpush.sendNotification(data.subscription, JSON.stringify({ title: `DM from ${from}`, body: (message||'New message').slice(0,100) }));

    return NextResponse.json({ok:true});
  }catch(e:any){
    return NextResponse.json({ok:true, warning:e.message});
  }
}
