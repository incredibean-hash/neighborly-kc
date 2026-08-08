export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ safe: true });
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','image/jpg'];
    if (!allowed.includes(file.type)) return NextResponse.json({ safe: false, reason: 'Only images' });
    if (file.size > 8*1024*1024) return NextResponse.json({ safe: false, reason: 'Too large' });
    return NextResponse.json({ safe: true });
  } catch { return NextResponse.json({ safe: true }); }
}
