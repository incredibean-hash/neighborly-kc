export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase(){
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest){
  try{
    const { street, zip, full, existingOwner, requester } = await req.json();
    const supabase = getSupabase();
    if(!supabase) return NextResponse.json({ success:true });
    try{
      await supabase.from('dms').insert({
        from_user: 'Neighborly KC Security',
        to_user: existingOwner,
        message: `⚠️ SECURITY ALERT: ${requester} tried to verify "${full||street+' '+zip}". Blocked.`,
        body: `Security alert`
      } as any);
    }catch{}
    try{
      await supabase.from('address_attempts').insert({
        street, zip, full_address: full, existing_owner: existingOwner, requester, attempted_at: new Date().toISOString(), blocked: true
      } as any);
    }catch{}
    return NextResponse.json({ success:true, alerted:true });
  }catch(e:any){
    return NextResponse.json({ success:true });
  }
}
