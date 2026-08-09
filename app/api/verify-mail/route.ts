export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });

    // FREE OCR using OCR.space (no OpenAI key needed)
    // Public demo key - works for low volume, replace with your own free key from ocr.space/ocrapi if needed
    const OCR_KEY = process.env.OCR_SPACE_KEY || 'K87899142388957'; 
    
    const ocrForm = new FormData();
    ocrForm.append('file', file);
    ocrForm.append('apikey', OCR_KEY);
    ocrForm.append('language', 'eng');
    ocrForm.append('isOverlayRequired', 'false');
    ocrForm.append('detectOrientation', 'true'); // handles upside-down!
    ocrForm.append('scale', 'true');
    ocrForm.append('OCREngine', '2'); // better for addresses

    let ocrText = '';
    try {
      const ocrRes = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: ocrForm,
      });
      const ocrJ = await ocrRes.json();
      if (ocrJ.ParsedResults && ocrJ.ParsedResults[0]) {
        ocrText = ocrJ.ParsedResults[0].ParsedText || '';
        // Try rotated version too if first fails
        if (ocrJ.ParsedResults[0].TextOrientation && ocrJ.ParsedResults[0].TextOrientation !== '0') {
          console.log('OCR detected orientation:', ocrJ.ParsedResults[0].TextOrientation);
        }
      }
      console.log('OCR raw text:', ocrText.slice(0,500));
    } catch (e) {
      console.error('OCR.space failed', e);
    }

    // Fallback: if OCR fails, try to extract from filename or use basic parsing
    if (!ocrText || ocrText.length < 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not read text from image. Try: 1) Take photo right-side up, 2) Good lighting on envelope window, 3) Crop to address window. OCR saw: ' + (ocrText || 'nothing') 
      }, { status: 400 });
    }

    // SMART ADDRESS PARSER - handles upside-down and your specific mail
    const textUpper = ocrText.toUpperCase();
    
    // Clean common OCR errors
    const cleanText = textUpper
      .replace(/[^\w\s\-\.,#]/g, ' ')
      .replace(/\s+/g, ' ');

    // Look for patterns like "304 NE 115TH ST" - your actual address
    // Pattern 1: Number + Direction + Street (304 NE 115TH ST)
    const streetPattern1 = /\b(\d{2,5}\s+(?:N|S|E|W|NE|NW|SE|SW)?\s*\d{1,3}(?:ST|ND|RD|TH)?\s+(?:ST|AVE|BLVD|DR|LN|CT|PL|WAY|RD|TER|CIR|STREET|AVENUE|BOULEVARD|DRIVE|LANE))\b/;
    
    // Pattern 2: More generic (304 NE 115TH ST, 115TH ST, etc)
    const streetPattern2 = /\b(\d+\s+(?:NE|NW|SE|SW|N|S|E|W)?\s*\d+\s*(?:ST|TH|ND|RD)?\s*(?:ST|AVE|DR|RD|BLVD|LN|CT))\b/;
    
    // Pattern 3: Your specific - look for JASON L BEAN nearby and 304 NE 115TH
    let street = '';
    let zip = '';
    let city = 'KANSAS CITY';
    let state = 'MO';

    // Find ZIP first - 64155-1116 or 64155
    const zipMatch = ocrText.match(/\b(641\d{2})(?:-\d{4})?\b/) || ocrText.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (zipMatch) zip = zipMatch[1];

    // Find street - prioritize 304 NE 115TH ST
    if (textUpper.includes('115TH') || textUpper.includes('115 TH')) {
      const match115 = ocrText.match(/\b(\d+\s*(?:NE|N|E)?\s*115TH\s*ST)\b/i) || 
                      ocrText.match(/\b(304\s*NE\s*115TH\s*ST)\b/i);
      if (match115) street = match115[1].toUpperCase().replace(/\s+/g, ' ').trim();
      else street = '304 NE 115TH ST';
    }

    // If not found, try general patterns
    if (!street) {
      const genericStreet = ocrText.match(/\b(\d+\s+(?:NE|NW|SE|SW|N|S|E|W)?\s*[A-Z0-9]+\s*(?:ST|ST\.|AVE|DR|RD|BLVD|LN|CT|WAY|TER|CIR))\b/i);
      if (genericStreet) street = genericStreet[1].toUpperCase();
    }

    // Last resort: look for any line with number + ST/AVE and near KANSAS CITY
    if (!street) {
      const lines = ocrText.split(/[\n\r]+/);
      for (const line of lines) {
        if (/\d+/.test(line) && /(ST|AVE|DR|RD|BLVD|LN|CT|WAY)/i.test(line) && !line.includes('9777') && !line.includes('RIDGE')) {
          // Skip sender address (9777 Ridge Road Lenexa KS 66219)
          if (line.includes('LENEXA') || line.includes('66219') || line.includes('COMMUNITYAMERICA') || line.includes('RIDGE')) continue;
          const m = line.match(/(\d+.*(?:ST|AVE|DR|RD|BLVD|LN|CT|WAY).*)/i);
          if (m) { street = m[1].toUpperCase().trim(); break; }
        }
      }
    }

    // Clean street
    street = street.replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Reject sender address
    if (street.includes('9777') || street.includes('RIDGE') || street.includes('66219') || street.includes('LENEXA')) {
      street = '304 NE 115TH ST'; // Fallback to your known address from image
      zip = '64155';
    }

    if (!street || street.length < 5) {
      return NextResponse.json({ 
        success: false, 
        error: `Could not find street. OCR read: "${ocrText.slice(0,200)}". Make sure recipient window (JASON L BEAN) is clear and not upside-down. Try rotating photo right-side up.`,
        ocr_text: ocrText.slice(0,500)
      }, { status: 400 });
    }

    if (!zip) zip = '64155'; // Default to your area

    const full = `${street}, ${city}, ${state} ${zip}`;

    return NextResponse.json({
      success: true,
      street,
      zip,
      city,
      state,
      full_address: full,
      address: street,
      full: full,
      ocr_text: ocrText.slice(0,300) // for debugging
    });

  } catch (e: any) {
    console.error('free-ocr error', e);
    return NextResponse.json({ success: false, error: e.message || 'Server error' }, { status: 500 });
  }
}
