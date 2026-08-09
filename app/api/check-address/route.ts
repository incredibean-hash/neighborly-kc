// app/api/check-address/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!);

function normalize(s:string){ return s.toLowerCase().replace(/[^a-z0-9]/g,''); }

export async function POST(req: NextRequest){
  try{
    const { street, zip, full, requester } = await req.json();
    if(!street && !zip) return NextResponse.json({ alreadyVerified:false });

    // Look for existing verified address with same street+zip or full
    const { data, error } = await supabase.from('verified_addresses').select('*').limit(100);
    if(error) throw error;

    const normStreet = normalize(street||'');
    const normFull = normalize(full||'');

    for(const row of data||[]){
      const rowNormStreet = normalize(row.street||'');
      const rowNormFull = normalize(row.full_address||'');
      const zipMatch = zip && row.zip && zip===row.zip;
      const streetMatch = normStreet && rowNormStreet && (normStreet===rowNormStreet || normFull.includes(rowNormFull) || rowNormFull.includes(normStreet));
      
      if((zipMatch && streetMatch) || (normFull && rowNormFull && normFull===rowNormFull)){
        // Found duplicate
        if(row.owner_name && row.owner_name.toLowerCase() === (requester||'').toLowerCase()){
          // Same person re-verifying - allow
          return NextResponse.json({ alreadyVerified:false });
        }
        return NextResponse.json({ alreadyVerified:true, owner: row.owner_name, address: row.full_address });
      }
    }

    return NextResponse.json({ alreadyVerified:false });
  }catch(e:any){
    console.error('check-address error', e);
    return NextResponse.json({ alreadyVerified:false }); // Fail open for now
  }
}
