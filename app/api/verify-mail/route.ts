// app/api/verify-mail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback - still allow but with limited parsing
      return NextResponse.json({ success: true, street: '', zip: '', city: '', full_address: 'Mail uploaded (AI key missing - manual check)', address: '' });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `You are an address extraction AI for a neighborhood verification app. Read the mailing address from this envelope/bill photo.

Extract:
- street: house number + street name (e.g. "123 Main St")
- city
- zip: 5-digit zip code
- full_address: combined readable address

Rules:
- Only extract what you can clearly see
- If no address visible, return empty strings
- Return JSON only, no extra text: {"street":"...","city":"...","zip":"...","full_address":"..."}`
              },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        max_tokens: 200
      })
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return NextResponse.json({ success: false, error: 'AI failed: ' + err }, { status: 500 });
    }

    const j = await aiRes.json();
    const content = j.choices?.[0]?.message?.content || '';
    let parsed: any = {};
    try {
      const cleaned = content.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON from text
      const match = content.match(/\{[^}]+\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    const street = parsed.street || parsed.address || '';
    const zip = parsed.zip || '';
    const city = parsed.city || '';
    const full = parsed.full_address || `${street} ${city} ${zip}`.trim();

    if (!street && !zip) {
      return NextResponse.json({ success: false, error: 'Could not read address from image. Try clearer photo of envelope.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      street,
      zip,
      city,
      address: street,
      full_address: full,
      full,
    });

  } catch (e: any) {
    console.error('verify-mail error', e);
    return NextResponse.json({ success: false, error: e.message || 'Server error' }, { status: 500 });
  }
}
