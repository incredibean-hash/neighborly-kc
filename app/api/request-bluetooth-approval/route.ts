
export const dynamic='force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function POST(req: NextRequest){
  const body = await req.json();
  try{
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const token = Math.random().toString(36).slice(2)+Date.now().toString(36);
    await supabase.from('bluetooth_approvals').insert({ token, owner:body.owner, requester:body.requester, address:body.address, street:body.street, zip:body.zip, status:'pending' });
    await supabase.from('dms').insert({ from_user:'Security', to_user:body.owner, message:`📲 ${body.requester} requests Bluetooth tap for ${body.address}`, body:'Request' });
    return NextResponse.json({ok:true, token});
  }catch(e:any){ return NextResponse.json({error:e.message},{status:500}); }
}
