
export const dynamic='force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function POST(req: NextRequest){
  const body = await req.json();
  try{
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await supabase.from('dms').insert({ from_user:'Security', to_user:body.existingOwner, message:`⚠️ ${body.requester} tried to verify ${body.full}`, body:'Alert' });
  }catch{}
  return NextResponse.json({ok:true});
}
