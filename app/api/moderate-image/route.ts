// app/api/moderate-image/route.ts
// Reuses SAME AI as /api/verify-mail - no new service needed
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ safe: true });

    // Basic local checks first (my code)
    const allowedTypes = ['image/jpeg','image/png','image/webp','image/gif','image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ safe: false, reason: 'Only images allowed' });
    }
    if (file.size > 8*1024*1024) {
      return NextResponse.json({ safe: false, reason: 'File too large' });
    }

    // Reuse same AI as mail verification - OpenAI Vision / same provider
    // If you have OPENAI_API_KEY set (same as verify-mail), it will use AI
    // If not, it falls back to local checks only
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // same cheap model as mail verification
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `You are a content moderator for a family-friendly neighborhood app (like Nextdoor). 
                    Check if this image contains inappropriate content for a neighborhood feed.
                    FLAG AS UNSAFE if it contains:
                    - Nudity, sexual content, porn, lingerie/underwear focus, genitalia, breasts exposed
                    - Graphic violence, gore, blood
                    - Hate symbols
                    - Drugs being used/sold

                    SAFE if it contains:
                    - Normal family photos, houses, pets, food, kids playing, landscapes, cars, furniture for sale, etc.
                    - People in normal clothes (even swimwear at pool is OK if not sexualized)

                    Respond with JSON only: {"safe": true/false, "reason": "short reason if unsafe"}`
                  },
                  {
                    type: 'image_url',
                    image_url: { url: dataUrl }
                  }
                ]
              }
            ],
            max_tokens: 100
          })
        });

        if (aiRes.ok) {
          const j = await aiRes.json();
          const content = j.choices?.[0]?.message?.content || '';
          // Try to parse JSON from response
          try {
            const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
            if (parsed.safe === false) {
              return NextResponse.json({ safe: false, reason: parsed.reason || 'Image flagged as inappropriate for neighborhood feed' });
            }
            return NextResponse.json({ safe: true });
          } catch {
            // If AI says unsafe in text
            const lower = content.toLowerCase();
            if (lower.includes('"safe": false') || lower.includes('unsafe') || lower.includes('inappropriate') || lower.includes('nudity') || lower.includes('sexual')) {
              return NextResponse.json({ safe: false, reason: 'Image flagged by AI as inappropriate for neighborhood' });
            }
            return NextResponse.json({ safe: true });
          }
        }
      } catch (e) {
        console.error('AI moderation failed, falling back to safe:', e);
        // Fall back to allowing - don't block if AI fails
      }
    }

    // No API key or AI failed - allow (my local checks already passed)
    // Your existing word filter will still catch bad filenames/text
    return NextResponse.json({ safe: true });

  } catch (e: any) {
    console.error('moderate-image error', e);
    return NextResponse.json({ safe: true }); // Fail open
  }
}
