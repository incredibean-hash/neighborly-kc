import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function esc(value: string) {
  return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] as string));
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const postId = String(body?.postId || '');
    const commentId = String(body?.commentId || '');
    if (!postId && !commentId) {
      return NextResponse.json({ error: 'postId or commentId is required' }, { status: 400 });
    }
    if (postId && commentId) {
      return NextResponse.json({ error: 'Only one reaction target is allowed' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      console.error('notify-reaction: Supabase server environment is incomplete');
      return NextResponse.json({ error: 'Notification service is not configured' }, { status: 503 });
    }

    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: { user: actor }, error: userError } = await anon.auth.getUser(token);
    if (userError || !actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    let ownerId = '';
    let excerpt = '';
    let targetLabel = 'post';

    if (postId) {
      const { data: post, error: postError } = await admin
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();
      if (postError || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

      ownerId = String(post.user_id || post.author_id || '');
      excerpt = esc(String(post.body || post.content || '').slice(0, 180));

      const { data: recentLike, error: likeError } = await admin
        .from('likes')
        .select('id,created_at')
        .eq('post_id', postId)
        .eq('author_id', actor.id)
        .is('comment_id', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1);
      if (likeError) {
        console.error('notify-reaction post like lookup error:', likeError);
        return NextResponse.json({ error: 'Could not verify reaction' }, { status: 500 });
      }
      if (!recentLike?.length) return NextResponse.json({ skipped: true, reason: 'no recent reaction' });
    } else {
      targetLabel = 'comment';
      const { data: comment, error: commentError } = await admin
        .from('comments')
        .select('*')
        .eq('id', commentId)
        .maybeSingle();
      if (commentError || !comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

      ownerId = String(comment.author_id || '');
      excerpt = esc(String(comment.body || comment.content || '').slice(0, 180));

      const { data: recentLike, error: likeError } = await admin
        .from('likes')
        .select('id,created_at')
        .eq('comment_id', commentId)
        .eq('author_id', actor.id)
        .is('post_id', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1);
      if (likeError) {
        console.error('notify-reaction comment like lookup error:', likeError);
        return NextResponse.json({ error: 'Could not verify reaction' }, { status: 500 });
      }
      if (!recentLike?.length) return NextResponse.json({ skipped: true, reason: 'no recent reaction' });
    }

    if (!ownerId) return NextResponse.json({ skipped: true, reason: `${targetLabel} has no account owner` });
    if (ownerId === actor.id) return NextResponse.json({ skipped: true, reason: 'self reaction' });

    const { data: ownerAuth, error: ownerAuthError } = await admin.auth.admin.getUserById(ownerId);
    if (ownerAuthError) console.error('notify-reaction owner lookup error:', ownerAuthError);
    const recipient = ownerAuth?.user?.email || '';
    if (!recipient) return NextResponse.json({ skipped: true, reason: `${targetLabel} owner has no auth email` });

    const { data: actorProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('auth_user_id', actor.id)
      .maybeSingle();
    const actorName = esc(
      actorProfile?.full_name ||
      actor.user_metadata?.full_name ||
      actor.user_metadata?.name ||
      actor.email?.split('@')[0] ||
      'A neighbor'
    );

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      return NextResponse.json({ skipped: true, reason: 'email provider is not configured' });
    }

    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://neighborlykc.com').replace(/\/$/, '');
    const subject = `${actorName} reacted to your Neighborly KC ${targetLabel} ❤️`;
    const html = `<!doctype html><html><body style="margin:0;background:#f0f6ff;font-family:Arial,Helvetica,sans-serif;color:#00205a"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #c2d5f0;border-radius:20px;overflow:hidden"><div style="background:#004687;padding:28px 30px;color:#fff"><div style="font-size:26px;font-weight:900">Neighborly KC</div><div style="font-size:12px;opacity:.75;margin-top:4px">Kansas City community</div></div><div style="padding:30px"><h2 style="margin:0 0 12px;font-size:22px">You got a reaction ❤️</h2><p style="font-size:16px;line-height:1.5;margin:0 0 18px"><strong>${actorName}</strong> reacted to your ${targetLabel}.</p>${excerpt ? `<div style="background:#e6eefb;border-radius:14px;padding:16px;font-size:14px;line-height:1.5;margin-bottom:22px">${excerpt}</div>` : ''}<a href="${site}" style="display:inline-block;background:#004687;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:999px">Open Neighborly KC</a></div></div></body></html>`;

    const resend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [recipient], subject, html }),
    });
    if (!resend.ok) {
      const detail = await resend.text();
      console.error('notify-reaction Resend error:', detail);
      return NextResponse.json({ error: 'Email provider rejected the message' }, { status: 502 });
    }

    const { error: notificationError } = await admin.from('notifications').insert({
      user_id: ownerId,
      type: 'reaction',
      message: `${actorProfile?.full_name || 'A neighbor'} reacted to your ${targetLabel}`,
    });
    if (notificationError) console.error('notify-reaction in-app notification error:', notificationError);

    return NextResponse.json({ sent: true, target: targetLabel });
  } catch (error: any) {
    console.error('notify-reaction error:', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
