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
    if (!postId) return NextResponse.json({ error: 'postId is required' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
    );

    const { data: { user: actor }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id,user_id,body,content,author_name')
      .eq('id', postId)
      .single();
    if (postError || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (!post.user_id || post.user_id === actor.id) return NextResponse.json({ skipped: true });

    // Confirm the caller actually has a recent post reaction. Likes are publicly readable
    // in this app, so this check works without giving the actor access to the owner's notifications.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentLike } = await supabase
      .from('likes')
      .select('id,created_at')
      .eq('post_id', postId)
      .eq('author_id', actor.id)
      .is('comment_id', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!recentLike?.length) return NextResponse.json({ skipped: true, reason: 'no recent reaction' });

    const { data: owner } = await supabase
      .from('profiles')
      .select('full_name,email')
      .eq('auth_user_id', post.user_id)
      .maybeSingle();
    const recipient = owner?.email || '';
    if (!recipient) return NextResponse.json({ skipped: true, reason: 'post owner has no email' });

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) return NextResponse.json({ skipped: true, reason: 'email provider is not configured' });

    const actorName = owner?.full_name ? esc(actor.user_metadata?.full_name || actor.user_metadata?.name || actor.email?.split('@')[0] || 'A neighbor') : 'A neighbor';
    const excerpt = esc(String(post.body || post.content || '').slice(0, 180));
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://neighborlykc.com').replace(/\/$/, '');

    const email = {
      from,
      to: [recipient],
      subject: `${actorName} reacted to your Neighborly KC post ❤️`,
      html: `<!doctype html><html><body style="margin:0;background:#f0f6ff;font-family:Arial,Helvetica,sans-serif;color:#00205a"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #c2d5f0;border-radius:20px;overflow:hidden"><div style="background:#004687;padding:28px 30px;color:#fff"><div style="font-size:26px;font-weight:900">Neighborly KC</div><div style="font-size:12px;opacity:.75;margin-top:4px">Kansas City • 40 Mile Radius</div></div><div style="padding:30px"><h2 style="margin:0 0 12px;font-size:22px">You got a reaction ❤️</h2><p style="font-size:16px;line-height:1.5;margin:0 0 18px"><strong>${actorName}</strong> reacted to your post.</p>${excerpt ? `<div style="background:#e6eefb;border-radius:14px;padding:16px;font-size:14px;line-height:1.5;margin-bottom:22px">${excerpt}</div>` : ''}<a href="${site}" style="display:inline-block;background:#004687;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:999px">Open Neighborly KC</a></div></div></body></html>`
    };

    const resend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(email),
    });
    if (!resend.ok) {
      const detail = await resend.text();
      console.error('Resend error:', detail);
      return NextResponse.json({ error: 'Email provider rejected the message' }, { status: 502 });
    }

    return NextResponse.json({ sent: true });
  } catch (error: any) {
    console.error('notify-reaction error:', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
