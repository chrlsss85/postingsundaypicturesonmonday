import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { contributorName } = await req.json();

    if (!contributorName) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }

    const token = Math.random().toString(36).substring(2, 10) +
      Math.random().toString(36).substring(2, 10);

    const slug = contributorName.toLowerCase().trim()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20) + '-' + Math.random().toString(36).substring(2, 6);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabaseAdmin
      .from('upload_tokens')
      .insert({
        token,
        slug,
        used: false,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, token, slug });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}