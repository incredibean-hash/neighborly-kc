// app/api/bluetooth-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest){
  const token = req.nextUrl.searchParams.get('token');
  if(!token) return NextResponse.json({ error:'No token' }, {status:400});
  const { data, error } = await supabase.from('bluetooth_approvals').select('*').eq('token', token).single();
  if(error) return NextResponse.json({ approval:null });
  return NextResponse.json({ approval:data });
}
