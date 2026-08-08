import { NextRequest, NextResponse } from 'next/server';

const KC_ZIPS_25MI = ['64155','64156','64119','64116','64117','64118','64112','64113','64114','64110','64111','64068','64030','64090','64132','64133','64151','64152','64153','64154','64158','64157','64089','64012','64014','64015','64016','64024','64048','64052','64055','64056','64064','64081','64082','64101','64102','64105','64106','64108','64109','64120','64121','64124','64126','64127','64128','64130','64131','64145','64146','66201','66202','66203','66204','66205','66206','66207','66208','66209','66210','66211','66212','66213','66214','66215','66216','66217','66218','66219','66220','66221','66223','66224','66225','66226','66227'];
const KC_ZIPS_5MI = ['64155','64156','64119','64158','64068','64030'];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const claimedZip = (form.get('zip') as string) || '';
    const claimedAddr = (form.get('address') as string) || '';

    if (!file) {
      return NextResponse.json({ verified: false, reason: 'No file uploaded' }, { status: 400 });
    }

    // Convert file to base64 for vision API
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mime = file.type || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${base64}`;

    // If no AI key, fallback to zip check so app still works
    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      const zip = claimedZip.slice(0,5);
      const is25 = KC_ZIPS_25MI.includes(zip);
      const is5 = KC_ZIPS_5MI.includes(zip) || zip==='64155';
      return NextResponse.json({
        verified: is5 || is25,
        extracted_address: `${claimedAddr}, ${zip}`,
        zip: zip,
        tier: is25 ? 25 : 5,
        reason: 'No AI key set - approved by zip list fallback',
        confidence: 0.6
      });
    }

    // Prefer OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are address verifier for Neighborly KC (Parkwood Hills, KC 64155). 
Look at mail/envelope/bill photo. Extract street address and ZIP. 
Return ONLY JSON: {"verified": true/false, "extracted_address": "full address you see", "zip": "5-digit zip", "confidence": 0-1, "reason": "short"}. 
Verified=true if you can read a physical mail piece with an address (envelope, bill, package label). Reject screenshots of maps, blank paper, or obvious fakes.`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Claimed: ${claimedAddr}, ${claimedZip}. Read the mail photo and extract real address.` },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ],
          max_tokens: 400,
        }),
      });
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI did not return JSON: '+content);
      const result = JSON.parse(match[0]);
      const zip = (result.zip || '').slice(0,5);
      const isIn25 = KC_ZIPS_25MI.includes(zip);
      return NextResponse.json({
        verified: result.verified && (isIn25 || !!result.extracted_address),
        extracted_address: result.extracted_address || `${claimedAddr}, ${zip}`,
        zip: zip || claimedZip.slice(0,5),
        tier: isIn25 ? 25 : 5,
        confidence: result.confidence || 0.8,
        reason: result.reason
      });
    }

    // Gemini fallback
    if (process.env.GEMINI_API_KEY) {
      const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `You are address verifier for Parkwood Hills KC 64155. Extract address and ZIP from this mail photo. Claimed: ${claimedAddr}, ${claimedZip}. Return ONLY JSON {"verified": bool, "extracted_address": string, "zip": "5-digit", "reason": string}. Verified=true if readable mail piece.` },
              { inline_data: { mime_type: mime, data: base64 } }
            ]
          }]
        })
      });
      const gj = await geminiResp.json();
      const txt = gj.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const m = txt.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Gemini no JSON: '+txt);
      const result = JSON.parse(m[0]);
      const zip = (result.zip || '').slice(0,5);
      return NextResponse.json({
        verified: result.verified,
        extracted_address: result.extracted_address,
        zip: zip || claimedZip.slice(0,5),
        tier: KC_ZIPS_25MI.includes(zip) ? 25 : 5,
        reason: result.reason
      });
    }

    return NextResponse.json({ verified: false, reason: 'No AI provider configured' }, { status: 500 });

  } catch (e:any) {
    console.error('verify-mail error', e);
    return NextResponse.json({ verified: false, reason: e.message }, { status: 500 });
  }
}

