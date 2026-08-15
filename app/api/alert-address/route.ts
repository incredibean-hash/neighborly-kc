export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const KC_LAT = 39.0997;
const KC_LNG = -94.5786;
const RADIUS = 40;

function getDist(lat1:number,lng1:number,lat2:number,lng2:number){
  const R=3959;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function getSupabase(){
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key) return null;
  return createClient(url,key);
}

export async function POST(req: NextRequest){
  try{
    const { author_name, text, category, alert_address, lat, lng, zip } = await req.json();
    
    if(!author_name || !text) return NextResponse.json({success:false, error:'Missing fields'}, {status:400});

    // Geo check - must be within 40mi if coords provided
    if(lat && lng){
      const d = getDist(lat,lng,KC_LAT,KC_LNG);
      if(d > RADIUS) return NextResponse.json({success:false, error:`Too far - ${d.toFixed(1)}mi from KC`}, {status:400});
    }

    const supabase = getSupabase();
    if(!supabase) return NextResponse.json({success:false, error:'DB not configured'}, {status:500});

    // Save alert - AREA ONLY, not exact home address
    const { data, error } = await supabase.from('posts').insert({
      author_name,
      body: text,
      text: text,
      category: category || 'Safety',
      alert_address: alert_address || null, // ex: "72nd & N Oak" or "6400 block N Oak"
      alert_area: alert_address || null,
      area: zip ? `${zip} Area` : 'KC Area',
      zip: zip || null,
      geo_lat: lat || null,
      geo_lng: lng || null,
      is_alert: true,
    } as any).select().single();

    if(error) return NextResponse.json({success:false, error:error.message}, {status:500});

    return NextResponse.json({success:true, post:data});
  }catch(e:any){
    return NextResponse.json({success:false, error:e.message}, {status:500});
  }
}

export async function GET(){
  return NextResponse.json({status:'alert-address API ready - use POST'});
}
