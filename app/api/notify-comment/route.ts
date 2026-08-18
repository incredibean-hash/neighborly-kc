import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const esc=(v:string)=>v.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] as string));

export async function POST(req:Request){
 try{
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/,'');
  if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
  const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
  const {data:{user}}=await anon.auth.getUser(token);
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {postId,commentId}=await req.json();
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  const [{data:post},{data:comment}]=await Promise.all([
   admin.from('posts').select('id,user_id,body,content').eq('id',String(postId||'')).maybeSingle(),
   admin.from('comments').select('id,post_id,author_id,author_name,body,content,created_at').eq('id',String(commentId||'')).maybeSingle()
  ]);
  if(!post||!comment||comment.post_id!==post.id||comment.author_id!==user.id)return NextResponse.json({error:'Comment not found'},{status:404});
  if(post.user_id===user.id)return NextResponse.json({skipped:true});
  if(Date.now()-new Date(comment.created_at).getTime()>10*60*1000)return NextResponse.json({error:'Comment is too old'},{status:400});
  const {data:owner}=await admin.from('profiles').select('email').eq('auth_user_id',post.user_id).maybeSingle();
  if(!owner?.email)return NextResponse.json({skipped:true,reason:'post owner has no email'});
  const apiKey=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
  if(!apiKey||!from)return NextResponse.json({skipped:true,reason:'email is not configured'});
  const actor=esc(comment.author_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'A neighbor');
  const commentText=esc(String(comment.body||comment.content||'').slice(0,500));
  const postText=esc(String(post.body||post.content||'').slice(0,180));
  const site=(process.env.NEXT_PUBLIC_SITE_URL||'https://neighborlykc.com').replace(/\/$/,'');
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[owner.email],subject:`${actor} commented on your Neighborly KC post`,html:`<!doctype html><html><body style="margin:0;background:#f0f6ff;font-family:Arial,sans-serif;color:#00205a"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #c2d5f0;border-radius:20px;overflow:hidden"><div style="background:#004687;padding:26px 30px;color:#fff;font-size:26px;font-weight:900">Neighborly KC</div><div style="padding:30px"><h2>New comment 🗨️</h2><p><strong>${actor}</strong> commented on your post.</p>${postText?`<div style="background:#e6eefb;padding:14px;border-radius:12px;margin:16px 0">${postText}</div>`:''}<div style="border-left:4px solid #004687;padding:12px 16px;margin:18px 0">${commentText}</div><a href="${site}" style="display:inline-block;background:#004687;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:999px">View your post</a></div></div></body></html>`})});
  if(!response.ok){console.error(await response.text());return NextResponse.json({error:'Email provider rejected the message'},{status:502});}
  await admin.from('notifications').insert({user_id:post.user_id,type:'comment',message:`${comment.author_name||'A neighbor'} commented on your post`});
  return NextResponse.json({sent:true});
 }catch(e:any){console.error('notify-comment error',e);return NextResponse.json({error:e.message||'Email failed'},{status:500});}
}
