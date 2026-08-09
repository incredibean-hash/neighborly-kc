// app/api/alert-address/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest){
  try{
    const { street, zip, full, existingOwner, requester } = await req.json();
    
    // 1. Create notification DM to existing owner
    try{
      await supabase.from('dms').insert({
        from_user: 'Neighborly KC Security',
        to_user: existingOwner,
        message: `⚠️ SECURITY ALERT: Someone named "${requester}" just tried to verify your address "${full||street+' '+zip}". If this was not you, your address is still secure and their verification was BLOCKED. If you know this person, contact admin.`,
        body: `Security alert for ${full}`
      } as any);
    }catch(e){ console.error('DM alert failed', e); }

    // 2. Log attempt
    try{
      await supabase.from('address_attempts').insert({
        street, zip, full_address: full,
        existing_owner: existingOwner,
        requester,
        attempted_at: new Date().toISOString(),
        blocked: true
      } as any);
    }catch{}

    // 3. Optionally send push if you have push setup
    try{
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/push/send`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ to: existingOwner, from: 'Security', message: `Someone tried to use your address ${full}` })
      });
    }catch{}

    return NextResponse.json({ success:true, alerted:true });
  }catch(e:any){
    console.error('alert-address error', e);
    return NextResponse.json({ success:false, error:e.message }, { status:500 });
  }
}
