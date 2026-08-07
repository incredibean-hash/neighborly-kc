import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest){
  try{
    const { user_name, subscription } = await req.json();
    if(!user_name || !subscription) return NextResponse.json({error:'missing'}, {status:400});
    // Upsert by user_name
    const { error } = await supabase.from('push_subscriptions').upsert({ user_name, subscription }, { onConflict: 'user_name' });
    if(error) throw error;
    return NextResponse.json({ok:true});
  }catch(e:any){
    return NextResponse.json({error:e.message}, {status:500});
  }
}
