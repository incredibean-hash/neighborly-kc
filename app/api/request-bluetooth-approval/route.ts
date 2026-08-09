// app/api/request-bluetooth-approval/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest){
  try{
    const { owner, requester, address, street, zip } = await req.json();
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    
    // Save approval token
    await supabase.from('bluetooth_approvals').insert({
      token,
      owner,
      requester,
      address: address||`${street} ${zip}`,
      street,
      zip,
      status: 'pending',
      created_at: new Date().toISOString()
    } as any);

    // DM owner with approval link
    const approveLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://neighborly-kc.vercel.app'}/bluetooth?token=${token}`;
    
    await supabase.from('dms').insert({
      from_user: 'Neighborly KC Security',
      to_user: owner,
      message: `📲 BLUETOOTH TAP REQUEST: ${requester} wants to join your address "${address}". If you're together, tap to approve via Bluetooth:\n\n${approveLink}\n\nThis link expires in 15 minutes. Tap it when you're near each other (within 30ft) to verify via Bluetooth.`,
      body: `Bluetooth approval for ${requester}`
    } as any);

    // Also notify requester
    await supabase.from('dms').insert({
      from_user: 'Neighborly KC Security',
      to_user: requester,
      message: `Your Bluetooth tap request sent to ${owner}. Ask them to check DMs and approve when you're together. They'll need to tap the link and scan for your device via Bluetooth.`,
      body: `Bluetooth request sent`
    } as any);

    return NextResponse.json({ success:true, token, link: approveLink });
  }catch(e:any){
    console.error('request-bluetooth-approval error', e);
    return NextResponse.json({ success:false, error:e.message }, {status:500});
  }
}
