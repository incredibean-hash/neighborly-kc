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
    const message = String(body?.message || '').trim();
    if (!message) return NextResponse.json({ error: 'Feedback is required' }, { status: 400 });
    if (message.length > 2000) return NextResponse.json({ error: 'Feedback is limited to 2,000 characters' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('full_name,email').eq('auth_user_id', user.id).maybeSingle();
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const to = process.env.FEEDBACK_TO_EMAIL;
    if (!apiKey || !from || !to) return NextResponse.json({ error: 'Feedback email is not configured yet.' }, { status: 503 });

    const senderName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Neighbor';
    const senderEmail = profile?.email || user.email || 'Unknown email';
    const safeName = esc(senderName);
    const safeEmail = esc(senderEmail);
    const safeMessage = esc(message).replace(/\n/g, '<br>');
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://neighborlykc.com').replace(/\/$/, '');
    const email = {
      from, to: [to], reply_to: senderEmail,
      subject: `Neighborly KC feedback from ${senderName}`,
      html: `<!doctype html><html><body style="margin:0;background:#f0f6ff;font-family:Arial,Helvetica,sans-serif;color:#00205a"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #c2d5f0;border-radius:20px;overflow:hidden"><div style="background:#004687;padding:28px 30px;color:#fff"><div style="font-size:26px;font-weight:900">Neighborly KC</div><div style="font-size:12px;opacity:.75;margin-top:4px">New user feedback</div></div><div style="padding:30px"><p style="font-size:15px;line-height:1.5;margin:0 0 8px"><strong>${safeName}</strong> (${safeEmail}) sent feedback:</p><div style="background:#e6eefb;border-radius:14px;padding:18px;font-size:15px;line-height:1.6;margin:18px 0 24px">${safeMessage}</div><a href="${site}" style="display:inline-block;background:#004687;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:999px">Open Neighborly KC</a></div></div></body></html>`
    };
    const resend = await fetch('https://api.resend.com/emails', { method:'POST', headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'}, body:JSON.stringify(email) });
    if (!resend.ok) { console.error('Feedback email error:', await resend.text()); return NextResponse.json({ error:'Email provider rejected the message' }, { status:502 }); }
    return NextResponse.json({ sent:true });
  } catch (error:any) {
    console.error('feedback error:', error);
    return NextResponse.json({ error:error?.message || 'Unexpected error' }, { status:500 });
  }
}
