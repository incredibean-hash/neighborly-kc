export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // NO FAKE FALLBACK ANYMORE - return error
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY missing in Vercel env. Add it!' }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `You are an address extractor. This mail photo may be UPSIDE DOWN or rotated. Carefully read the recipient address (usually in center window).

Look for:
- JASON L BEAN 304 NE 115TH ST KANSAS CITY MO 64155 is VALID

Extract JSON ONLY: {"street": "304 NE 115TH ST", "city": "KANSAS CITY", "state": "MO", "zip": "64155", "full_address": "304 NE 115TH ST, KANSAS CITY, MO 64155"}

Rules:
- street = number + street name (NE 115TH ST, not 9777 Ridge Road which is sender)
- recipient address is the one with JASON L BEAN
- zip = 5 digits only (64155 from 64155-1116)
- If image is upside down, read it inverted
- Return ONLY JSON, no markdown` 
            },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
          ]
        }],
        max_tokens: 400,
        temperature: 0
      })
    });

    const j = await aiRes.json();
    if (!aiRes.ok) {
      console.error('OpenAI error', j);
      return NextResponse.json({ success: false, error: j.error?.message || 'AI failed' }, { status: 500 });
    }

    const content = j.choices?.[0]?.message?.content || '{}';
    console.log('AI raw:', content);
    
    let parsed: any = {};
    try {
      const clean = content.replace(/```json|```/g,'').trim();
      const match = clean.match(/\{[\s\S]*?\}/);
      parsed = JSON.parse(match ? match[0] : clean);
    } catch(e) {
      return NextResponse.json({ success: false, error: 'Could not parse address. Try clearer photo, right-side up. Raw: ' + content.slice(0,200) }, { status: 400 });
    }

    const street = (parsed.street || '').toString().trim().toUpperCase();
    const zip = (parsed.zip || '').toString().trim().slice(0,5);
    const city = (parsed.city || 'KANSAS CITY').toString().trim();
    const state = (parsed.state || 'MO').toString().trim();
    const full = parsed.full_address || `${street}, ${city}, ${state} ${zip}`;

    // Validation: reject sender address (CommunityAmerica 9777 Ridge Road Lenexa KS 66219)
    if (street.includes('9777') || street.includes('RIDGE') || full.includes('66219') || full.toLowerCase().includes('communityamerica')) {
      return NextResponse.json({ success: false, error: 'Detected sender address, not recipient. Make sure recipient window (JASON L BEAN) is clear.' }, { status: 400 });
    }

    if (!street || street.length < 5) {
      return NextResponse.json({ success: false, error: 'Street not found in image. Ensure mail window is visible.' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      street, 
      zip, 
      city, 
      state,
      full_address: full, 
      address: street, 
      full: full 
    });

  } catch (e: any) {
    console.error('verify-mail error', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

