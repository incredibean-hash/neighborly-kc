export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ success: true, street: '', zip: '', city: '', full_address: 'Mail uploaded', address: '' });
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: [{ type: 'text', text: `Extract mailing address. Return JSON: {"street":"...","city":"...","zip":"...","full_address":"..."}` }, { type: 'image_url', image_url: { url: dataUrl } }] }],
        max_tokens: 200
      })
    });
    if (!aiRes.ok) return NextResponse.json({ success: false, error: 'AI failed' }, { status: 500 });
    const j = await aiRes.json();
    const content = j.choices?.[0]?.message?.content || '';
    let parsed: any = {};
    try { parsed = JSON.parse(content.replace(/```json|```/g, '').trim()); } catch { const m = content.match(/\{[^}]+\}/); if(m) try{ parsed=JSON.parse(m[0]); }catch{} }
    const street = parsed.street || parsed.address || '';
    const zip = parsed.zip || '';
    const city = parsed.city || '';
    const full = parsed.full_address || `${street} ${city} ${zip}`.trim();
    if (!street && !zip) return NextResponse.json({ success: false, error: 'Could not read address' }, { status: 400 });
    return NextResponse.json({ success: true, street, zip, city, address: street, full_address: full, full });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
