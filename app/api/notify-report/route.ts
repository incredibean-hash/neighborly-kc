import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const esc=(value:string)=>value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char] as string));

export async function POST(req:Request){
  try{
    const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
    if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
    const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
    const {data:{user}}=await anon.auth.getUser(token);
    if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
    const {postId}=await req.json();
    const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
    const [{data:post},{data:report},{data:admins,error:adminsError}]=await Promise.all([
      admin.from('posts').select('*').eq('id',String(postId||'')).maybeSingle(),
      admin.from('post_reports').select('*').eq('post_id',String(postId||'')).eq('reporter_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
      admin.from('profiles').select('auth_user_id,full_name').eq('is_admin',true).not('auth_user_id','is',null)
    ]);
    if(!post||!report)return NextResponse.json({error:'Report not found'},{status:404});
    if(adminsError)throw adminsError;
    const adminIds=[...new Set((admins||[]).map((item:any)=>item.auth_user_id).filter(Boolean))];
    const reporter=String(user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'A neighbor');
    const alertMessage=`🚩 New post report: ${report.reason} — reported by ${reporter}`;
    if(adminIds.length)await admin.from('notifications').insert(adminIds.map(user_id=>({user_id,type:'report',post_id:post.id,actor_id:user.id,message:alertMessage})));

    const apiKey=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
    if(!apiKey||!from)return NextResponse.json({notified:adminIds.length,email:'not configured'});
    const authUsers=await Promise.all(adminIds.map(id=>admin.auth.admin.getUserById(id)));
    const recipients=[...new Set([...authUsers.map(result=>result.data.user?.email).filter(Boolean),process.env.ADMIN_NOTIFICATION_EMAIL,process.env.FEEDBACK_TO_EMAIL].filter(Boolean) as string[])];
    if(!recipients.length)return NextResponse.json({notified:adminIds.length,email:'no recipient'});
    const site=(process.env.NEXT_PUBLIC_SITE_URL||'https://neighborlykc.com').replace(/\/$/,'');
    const details=report.details?`<p><strong>Details:</strong> ${esc(String(report.details))}</p>`:'';
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:recipients,subject:`🚩 Neighborly KC report: ${report.reason}`,html:`<!doctype html><html><body style="margin:0;background:#f0f6ff;font-family:Arial,sans-serif;color:#00205a"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #c2d5f0;border-radius:20px;overflow:hidden"><div style="background:#004687;padding:26px 30px;color:#fff;font-size:26px;font-weight:900">Neighborly KC</div><div style="padding:30px"><h2>New post report 🚩</h2><p><strong>Reason:</strong> ${esc(report.reason)}</p><p><strong>Reported by:</strong> ${esc(reporter)}</p>${details}<p style="color:#52647f">Post preview: ${esc(String(post.body||post.content||'').slice(0,280))}</p><a href="${site}" style="display:inline-block;background:#004687;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:999px">Review in Neighborly KC</a></div></div></body></html>`})});
    if(!response.ok)console.error('report email failed:',await response.text());
    return NextResponse.json({notified:adminIds.length,email:response.ok?'sent':'failed'});
  }catch(error:any){console.error('notify-report error',error);return NextResponse.json({error:error.message||'Could not notify admins'},{status:500});}
}

export const dynamic='force-dynamic';
