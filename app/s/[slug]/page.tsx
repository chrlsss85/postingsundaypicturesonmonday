'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Post {
  id: string;
  slug: string;
  contributor: string;
  caption: string;
  photo_urls: string[];
  track_preview_url: string;
  track_name: string;
  track_artist: string;
  track_album_art: string;
  dominant_color: string;
  transition: string;
  show_song_info: boolean;
  show_audio_ctrl: boolean;
}

export default function ViewerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [muted, setMuted] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [tapToPlay, setTapToPlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_live', true)
      .single();

    if (error || !data) {
      setNotFound(true);
    } else {
      setPost(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!post) return;
    const audio = new Audio(post.track_preview_url);
    audio.loop = true;
    audio.muted = muted;
    audioRef.current = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => setTapToPlay(true));
    }

    startProgress();
    startAutoAdvance();

    return () => {
      audio.pause();
      if (progressRef.current) clearInterval(progressRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [post]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const startProgress = () => {
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressRef.current!);
          return 100;
        }
        return p + (100 / 50);
      });
    }, 100);
  };

  const startAutoAdvance = () => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = setTimeout(() => {
      goNext();
    }, 5000);
  };

  const goNext = () => {
    if (!post) return;
    if (currentPhoto < post.photo_urls.length - 1) {
      setCurrentPhoto(p => p + 1);
    } else {
      setCurrentPhoto(0);
    }
    startProgress();
    startAutoAdvance();
  };

  const goPrev = () => {
    if (currentPhoto > 0) {
      setCurrentPhoto(p => p - 1);
      startProgress();
      startAutoAdvance();
    }
  };

  const handleTapToPlay = () => {
    audioRef.current?.play();
    setTapToPlay(false);
  };

  if (loading) {
    return (
      <div style={{ ...styles.fullscreen, background: '#0e0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', letterSpacing: '0.1em' }}>loading...</p>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div style={{ ...styles.fullscreen, background: '#0e0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', letterSpacing: '0.08em' }}>nothing here this week.</p>
        <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' }}>
          go home
        </button>
      </div>
    );
  }

  const bgColor = darkMode ? '#0e0e0e' : '#f0ebe4';
  const accentColor = post.dominant_color || '#c78c56';

  return (
    <div style={{ ...styles.fullscreen, background: bgColor }}>

      {/* Photo background */}
      <div style={styles.photoWrap}>
        {post.photo_urls.map((url, i) => (
          <div
            key={i}
            style={{
              ...styles.photoBg,
              backgroundImage: `url(${url})`,
              opacity: i === currentPhoto ? 1 : 0,
              transition: post.transition === 'instant' ? 'none' : post.transition === 'slide' ? 'opacity 0.3s ease' : 'opacity 0.6s ease',
            }}
          />
        ))}
      </div>

      {/* Overlays */}
      <div style={styles.vignetteOverlay} />
      <div style={styles.topScrim} />
      <div style={styles.bottomScrim} />

      {/* Tap zones */}
      <div onClick={goPrev} style={styles.tapLeft} />
      <div onClick={goNext} style={styles.tapRight} />

      {/* Top UI */}
      <div style={styles.topUI}>
        <div style={styles.progressBars}>
          {post.photo_urls.map((_, i) => (
            <div key={i} style={styles.progressBarOuter}>
              <div style={{
                ...styles.progressBarInner,
                width: i < currentPhoto ? '100%' : i === currentPhoto ? `${progress}%` : '0%',
                background: accentColor,
              }} />
            </div>
          ))}
        </div>
        <div style={styles.topRow}>
          <span style={styles.contributorName}>{post.contributor}</span>
          <div style={styles.topActions}>
            <button onClick={() => setDarkMode(!darkMode)} style={styles.iconBtn}>
              {darkMode ? '☀' : '☾'}
            </button>
            <button onClick={() => setMuted(!muted)} style={styles.iconBtn}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom UI */}
      <div style={styles.bottomUI}>
        {post.caption && (
          <p style={styles.caption}>{post.caption}</p>
        )}
        <div style={styles.bottomRow}>
          {post.show_song_info && (
            <div style={styles.songInfo}>
              <img src={post.track_album_art} alt="" style={styles.albumArt} />
              <div>
                <p style={styles.songName}>{post.track_name}</p>
                <p style={styles.songArtist}>{post.track_artist}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'PostingSundayPicturesOnMonday', url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied!');
              }
            }}
            style={styles.shareBtn}
          >
            share ↗
          </button>
        </div>
        <p style={styles.watermark}>PostingSundayPicturesOnMonday</p>
      </div>

      {/* Tap to play overlay */}
      {tapToPlay && (
        <div onClick={handleTapToPlay} style={styles.tapToPlay}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', letterSpacing: '0.05em' }}>tap to play audio</p>
        </div>
      )}

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fullscreen: {
    width: '100vw',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
  },
  photoWrap: {
    position: 'absolute',
    inset: 0,
  },
  photoBg: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  vignetteOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.42) 100%)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '140px',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 3,
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '200px',
    background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 3,
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '33%',
    height: '100%',
    zIndex: 6,
    cursor: 'pointer',
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '67%',
    height: '100%',
    zIndex: 6,
    cursor: 'pointer',
  },
  topUI: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: '20px 18px 0',
  },
  progressBars: {
    display: 'flex',
    gap: '3px',
    marginBottom: '12px',
  },
  progressBarOuter: {
    flex: 1,
    height: '2px',
    background: 'rgba(255,255,255,0.25)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.1s linear',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contributorName: {
    fontFamily: 'Georgia, serif',
    fontSize: '24px',
    color: '#fff',
    letterSpacing: '0.01em',
  },
  topActions: {
    display: 'flex',
    gap: '8px',
  },
  iconBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomUI: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: '0 18px 32px',
  },
  caption: {
    fontFamily: 'Georgia, serif',
    fontSize: '26px',
    color: '#fff',
    margin: '0 0 10px',
    lineHeight: '1.1',
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  songInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  albumArt: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  songName: {
    fontSize: '12px',
    color: '#fff',
    margin: '0 0 2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  songArtist: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.6)',
    margin: '0',
  },
  shareBtn: {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    padding: '7px 16px',
    borderRadius: '30px',
    fontSize: '12px',
    cursor: 'pointer',
    flexShrink: 0,
    marginLeft: '10px',
  },
  watermark: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.22)',
    textAlign: 'center',
    margin: '0',
    letterSpacing: '0.1em',
  },
  tapToPlay: {
    position: 'absolute',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    background: 'rgba(0,0,0,0.5)',
    padding: '10px 20px',
    borderRadius: '20px',
    cursor: 'pointer',
  },
};