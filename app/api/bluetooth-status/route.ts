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

export async function GET(req: NextRequest){
  try{
    const token = req.nextUrl.searchParams.get('token');
    if(!token) return NextResponse.json({ error:'No token' }, {status:400});
    const supabase = getSupabase();
    if(!supabase) return NextResponse.json({ approval:null });
    const { data } = await supabase.from('bluetooth_approvals').select('*').eq('token', token).single();
    return NextResponse.json({ approval:data||null });
  }catch{ return NextResponse.json({ approval:null }); }
}

