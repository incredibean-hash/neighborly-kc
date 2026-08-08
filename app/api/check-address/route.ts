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
function normalize(s:string){ return (s||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
export async function POST(req: NextRequest){
  try{
    const { street, zip, full, requester } = await req.json();
    if(!street && !zip) return NextResponse.json({ alreadyVerified:false });
    const supabase = getSupabase();
    if(!supabase) return NextResponse.json({ alreadyVerified:false });
    const { data } = await supabase.from('verified_addresses').select('*').limit(100);
    const normStreet = normalize(street);
    const normFull = normalize(full);
    for(const row of (data||[]) as any[]){
      const rowNormStreet = normalize(row.street);
      const rowNormFull = normalize(row.full_address);
      const zipMatch = zip && row.zip && zip===row.zip;
      const streetMatch = normStreet && rowNormStreet && (normStreet===rowNormStreet || normFull.includes(rowNormFull) || rowNormFull.includes(normStreet));
      if((zipMatch && streetMatch) || (normFull && rowNormFull && normFull===rowNormFull)){
        if(row.owner_name && requester && row.owner_name.toLowerCase() === requester.toLowerCase()){
          return NextResponse.json({ alreadyVerified:false });
        }
        return NextResponse.json({ alreadyVerified:true, owner: row.owner_name, address: row.full_address });
      }
    }
    return NextResponse.json({ alreadyVerified:false });
  }catch{ return NextResponse.json({ alreadyVerified:false }); }
}
