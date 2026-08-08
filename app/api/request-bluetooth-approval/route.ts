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
    const { owner, requester, address, street, zip } = await req.json();
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const supabase = getSupabase();
    if(!supabase) return NextResponse.json({ success:false, error:'DB not configured' }, {status:500});
    await supabase.from('bluetooth_approvals').insert({ token, owner, requester, address: address||`${street} ${zip}`, street, zip, status: 'pending', created_at: new Date().toISOString() } as any);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://neighborly-kc.vercel.app');
    const link = `${baseUrl}/bluetooth?token=${token}`;
    try{
      await supabase.from('dms').insert({ from_user: 'Neighborly KC Security', to_user: owner, message: `📲 BLUETOOTH TAP: ${requester} wants "${address}". Approve: ${link}`, body: `Bluetooth approval` } as any);
    }catch{}
    return NextResponse.json({ success:true, token, link });
  }catch(e:any){
    return NextResponse.json({ success:false, error:e.message }, {status:500});
  }
}
