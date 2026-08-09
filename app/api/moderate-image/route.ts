export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try { return NextResponse.json({ safe: true }); } catch { return NextResponse.json({ safe: true }); }
}
