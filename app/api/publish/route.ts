import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      token,
      slug,
      contributor,
      caption,
      photo_urls,
      track_preview_url,
      track_name,
      track_artist,
      track_album_art,
      dominant_color,
      transition,
      show_song_info,
      show_audio_ctrl,
    } = body;

    // Validate token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('upload_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Invalid or used token' }, { status: 401 });
    }

    // Set expiry to next Tuesday midnight UTC
    const now = new Date();
    const day = now.getUTCDay();
    const daysUntilTuesday = (2 - day + 7) % 7 || 7;
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(now.getUTCDate() + daysUntilTuesday);
    expiresAt.setUTCHours(0, 0, 0, 0);

    // Delete any existing post with same slug
    await supabaseAdmin
      .from('posts')
      .delete()
      .eq('slug', slug);

    // Insert new post
    const { error: insertError } = await supabaseAdmin
      .from('posts')
      .insert({
        slug,
        contributor,
        caption,
        photo_urls,
        track_preview_url,
        track_name,
        track_artist,
        track_album_art,
        dominant_color,
        transition,
        show_song_info,
        show_audio_ctrl,
        expires_at: expiresAt.toISOString(),
        is_live: true,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Mark token as used
    await supabaseAdmin
      .from('upload_tokens')
      .update({ used: true })
      .eq('token', token);

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 });
  }
}