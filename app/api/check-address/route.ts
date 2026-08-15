
export const dynamic='force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function POST(req: NextRequest){
  const { street, zip } = await req.json();
  try{
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data } = await supabase.from('verified_addresses').select('*').ilike('street','%'+street+'%').eq('zip',zip).limit(1);
    if(data && data.length>0) return NextResponse.json({ alreadyVerified:true, owner:data[0].owner_name });
    return NextResponse.json({ alreadyVerified:false });
  }catch{ return NextResponse.json({ alreadyVerified:false }); }
}
