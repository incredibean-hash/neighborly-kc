import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest){
  try{
    const body = await req.json();
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await supabase.from('push_subscriptions').upsert({ 
      user_name: body.user_name, 
      subscription: body.subscription 
    }, { onConflict: 'user_name' });
    if(error) throw error;
    return NextResponse.json({ok:true});
  }catch(e:any){
    return NextResponse.json({error:e.message}, {status:500});
  }
}
