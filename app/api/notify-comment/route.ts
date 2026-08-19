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
  const [{data:post,error:postError},{data:comment,error:commentError}]=await Promise.all([
   // Select the stored rows without naming optional legacy columns. Some
   // NeighborlyKC databases use `body`, while older tables use `content`.
   admin.from('posts').select('*').eq('id',String(postId||'')).maybeSingle(),
   admin.from('comments').select('*').eq('id',String(commentId||'')).maybeSingle()
  ]);
  if(postError||commentError){console.error('notify-comment lookup error:',postError||commentError);return NextResponse.json({error:'Could not verify the comment'},{status:500});}
  if(!post||!comment||comment.post_id!==post.id||comment.author_id!==user.id)return NextResponse.json({error:'Comment not found'},{status:404});
  const ownerId=post.user_id||post.author_id;
  if(!ownerId)return NextResponse.json({skipped:true,reason:'post has no account owner'});
  if(ownerId===user.id)return NextResponse.json({skipped:true});
  if(Date.now()-new Date(comment.created_at).getTime()>10*60*1000)return NextResponse.json({error:'Comment is too old'},{status:400});
  // The auth account is the authoritative email source. A profile may be
  // missing, renamed, or use a legacy id column, but that must not prevent a
  // post owner from receiving their comment alert.
  const {data:ownerAuth,error:ownerAuthError}=await admin.auth.admin.getUserById(ownerId);
  if(ownerAuthError)console.error('notify-comment owner lookup error:',ownerAuthError);
  const ownerEmail=ownerAuth?.user?.email;
  if(!ownerEmail)return NextResponse.json({skipped:true,reason:'post owner has no auth email'});
  const apiKey=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
  if(!apiKey||!from)return NextResponse.json({skipped:true,reason:'email is not configured'});
  const actor=esc(comment.author_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'A neighbor');
  const commentText=esc(String(comment.body||comment.content||'').slice(0,500));
  const postText=esc(String(post.body||post.content||'').slice(0,180));
  const site=(process.env.NEXT_PUBLIC_SITE_URL||'https://neighborlykc.com').replace(/\/$/,'');
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[ownerEmail],subject:`${actor} commented on your Neighborly KC post`,html:`<!doctype html><html><body style="margin:0;background:#f0f6ff;font-family:Arial,sans-serif;color:#00205a"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #c2d5f0;border-radius:20px;overflow:hidden"><div style="background:#004687;padding:26px 30px;color:#fff;font-size:26px;font-weight:900">Neighborly KC</div><div style="padding:30px"><h2>New comment 🗨️</h2><p><strong>${actor}</strong> commented on your post.</p>${postText?`<div style="background:#e6eefb;padding:14px;border-radius:12px;margin:16px 0">${postText}</div>`:''}<div style="border-left:4px solid #004687;padding:12px 16px;margin:18px 0">${commentText}</div><a href="${site}" style="display:inline-block;background:#004687;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:999px">View your post</a></div></div></body></html>`})});
  if(!response.ok){console.error(await response.text());return NextResponse.json({error:'Email provider rejected the message'},{status:502});}
  await admin.from('notifications').insert({user_id:ownerId,type:'comment',message:`${comment.author_name||'A neighbor'} commented on your post`});
  return NextResponse.json({sent:true});
 }catch(e:any){console.error('notify-comment error',e);return NextResponse.json({error:e.message||'Email failed'},{status:500});}
}
