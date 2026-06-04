import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
    }

    // Fetch the image
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sample pixels to find dominant color
    // Look at pixels spread across the image
    let r = 0, g = 0, b = 0, count = 0;

    // Sample every 100th byte (every ~33rd pixel in RGB)
    for (let i = 0; i < buffer.length - 3; i += 300) {
      r += buffer[i];
      g += buffer[i + 1];
      b += buffer[i + 2];
      count++;
    }

    if (count === 0) {
      return NextResponse.json({ color: '#1a1a1a' });
    }

    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);

    const hex = '#' +
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0');

    return NextResponse.json({ color: hex });
  } catch {
    return NextResponse.json({ color: '#1a1a1a' });
  }
}