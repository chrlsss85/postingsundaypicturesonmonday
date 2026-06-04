'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPasscodeInput, setShowPasscodeInput] = useState(true);
  const [post, setPost] = useState<{ slug: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pspm_unlocked');
    if (stored === 'true') {
      setIsUnlocked(true);
      setShowPasscodeInput(false);
      checkForActivePost();
    }
  }, []);

  const checkForActivePost = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('slug')
      .eq('is_live', true)
      .single();
    setPost(data || null);
    setLoading(false);
  };

  const handlePasscodeSubmit = () => {
    if (passcode === process.env.NEXT_PUBLIC_VIEWER_PASSCODE) {
      localStorage.setItem('pspm_unlocked', 'true');
      setIsUnlocked(true);
      setShowPasscodeInput(false);
      checkForActivePost();
    } else {
      alert('Incorrect passcode');
      setPasscode('');
    }
  };

  if (showPasscodeInput) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.watermark}>PostingSundayPicturesOnMonday</p>
          <h1 style={styles.title}>this is a private space.</h1>
          <p style={styles.subtitle}>for a select few.</p>
          <input
            type="text"
            placeholder="enter passcode"
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePasscodeSubmit()}
            style={styles.input}
            autoFocus
          />
          <button onClick={handlePasscodeSubmit} style={styles.button}>
            enter →
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.watermark}>PostingSundayPicturesOnMonday</p>
          <p style={styles.loading}>loading...</p>
        </div>
      </div>
    );
  }

  if (post) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.watermark}>PostingSundayPicturesOnMonday</p>
          <h1 style={styles.title}>it&apos;s live this week.</h1>
          <p style={styles.subtitle}>tap to view</p>
          <button onClick={() => router.push(`/s/${post.slug}`)} style={styles.button}>
            view post →
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('pspm_unlocked');
              setShowPasscodeInput(true);
              setPasscode('');
            }}
            style={styles.secondaryBtn}
          >
            sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <p style={styles.watermark}>PostingSundayPicturesOnMonday</p>
        <h1 style={styles.title}>come back<br />sunday.</h1>
        <p style={styles.subtitle}>no post this week.</p>
        <button
          onClick={() => {
            localStorage.removeItem('pspm_unlocked');
            setShowPasscodeInput(true);
            setPasscode('');
          }}
          style={styles.secondaryBtn}
        >
          sign out
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0e0e0e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  watermark: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: '0.1em',
    margin: '0 0 36px',
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: '44px',
    color: '#fff',
    margin: '0 0 8px',
    fontWeight: '400',
    lineHeight: '1.05',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
    margin: '0 0 32px',
    letterSpacing: '0.02em',
  },
  input: {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    fontSize: '18px',
    padding: '8px 0 12px',
    outline: 'none',
    width: '100%',
    marginBottom: '36px',
    caretColor: 'white',
  },
  button: {
    background: '#fff',
    color: '#0e0e0e',
    border: 'none',
    padding: '16px',
    borderRadius: '32px',
    fontSize: '18px',
    cursor: 'pointer',
    width: '100%',
    marginBottom: '8px',
  },
  secondaryBtn: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(255,255,255,0.15)',
    padding: '14px',
    borderRadius: '32px',
    fontSize: '15px',
    cursor: 'pointer',
  },
  loading: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '13px',
    margin: '60px 0',
    textAlign: 'center',
    letterSpacing: '0.1em',
  },
};