import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
function esc(value:string){return value.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] as string));}
export async function POST(req:Request){
  try{
    const auth=req.headers.get('authorization')||''; const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token) return NextResponse.json({error:'Unauthorized'},{status:401});
    const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
    const {data:{user},error}=await supabase.auth.getUser(token); if(error||!user)return NextResponse.json({error:'Unauthorized'},{status:401});
    const body=await req.json().catch(()=>({})); const message=String(body?.message||'').trim(); if(!message)return NextResponse.json({error:'Feedback is required'},{status:400}); if(message.length>2000)return NextResponse.json({error:'Feedback is too long'},{status:400});
    const to=process.env.FEEDBACK_TO_EMAIL, apiKey=process.env.RESEND_API_KEY, from=process.env.RESEND_FROM_EMAIL; if(!to||!apiKey||!from)return NextResponse.json({error:'Feedback email is not configured'},{status:503});
    const name=String(user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Neighbor');
    const email={from,to:[to],reply_to:user.email||undefined,subject:`Neighborly KC feedback from ${name}`,html:`<div style="font-family:Arial,sans-serif;max-width:650px"><h2>Neighborly KC feedback</h2><p><strong>From:</strong> ${esc(name)}</p><p><strong>Email:</strong> ${esc(user.email||'')}</p><hr/><p style="white-space:pre-wrap;line-height:1.6">${esc(message)}</p></div>`};
    const resend=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(email)}); if(!resend.ok){console.error(await resend.text());return NextResponse.json({error:'Email provider rejected the message'},{status:502});}
    return NextResponse.json({sent:true});
  }catch(e:any){return NextResponse.json({error:e?.message||'Unexpected error'},{status:500});}
}
