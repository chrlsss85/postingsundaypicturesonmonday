'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Token {
  id: string;
  token: string;
  slug: string;
  used: boolean;
  created_at: string;
  expires_at: string;
}

interface Post {
  id: string;
  contributor: string;
  slug: string;
  published_at: string;
  is_live: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const [newSlug, setNewSlug] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('pspm_admin');
    if (stored === 'true') {
      setIsUnlocked(true);
      loadData();
    }
  }, []);

  const handlePasscode = () => {
    if (passcode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE) {
      localStorage.setItem('pspm_admin', 'true');
      setIsUnlocked(true);
      loadData();
    } else {
      alert('Wrong passcode');
      setPasscode('');
    }
  };

  const loadData = async () => {
    setLoading(true);
    const { data: tokenData } = await supabase
      .from('upload_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: postData } = await supabase
      .from('posts')
      .select('id, contributor, slug, published_at, is_live')
      .order('published_at', { ascending: false })
      .limit(10);

    setTokens(tokenData || []);
    setPosts(postData || []);
    setLoading(false);
  };

const generateToken = async () => {
    if (!newSlug.trim()) {
      alert('Enter a contributor name first');
      return;
    }

    const res = await fetch('/api/generate-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contributorName: newSlug }),
    });

    const data = await res.json();

    if (!data.success) {
      alert('Failed to generate token');
      return;
    }

    setNewSlug('');
    loadData();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/upload/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(''), 2000);
  };

  const revokeToken = async (id: string) => {
    await supabase.from('upload_tokens').delete().eq('id', id);
    loadData();
  };

  const wipePost = async (id: string) => {
    await supabase.from('posts').update({ is_live: false }).eq('id', id);
    loadData();
  };

  if (!isUnlocked) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.watermark}>PostingSundayPicturesOnMonday</p>
          <h1 style={styles.title}>admin.</h1>
          <p style={styles.subtitle}>owners only.</p>
          <input
            type="password"
            placeholder="admin passcode"
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePasscode()}
            style={styles.input}
            autoFocus
          />
          <button onClick={handlePasscode} style={styles.primaryBtn}>enter →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <p style={styles.watermark}>admin panel</p>
          <button
            onClick={() => {
              localStorage.removeItem('pspm_admin');
              setIsUnlocked(false);
            }}
            style={styles.signOutBtn}
          >sign out</button>
        </div>

        {/* Generate new token */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>generate contributor link</p>
          <div style={styles.row}>
            <input
              type="text"
              placeholder="contributor name"
              value={newSlug}
              onChange={e => setNewSlug(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateToken()}
              style={styles.searchInput}
            />
            <button onClick={generateToken} style={styles.generateBtn}>
              generate
            </button>
          </div>
        </div>

        {/* Active tokens */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>contributor links</p>
          {loading && <p style={styles.empty}>loading...</p>}
          {!loading && tokens.length === 0 && (
            <p style={styles.empty}>no links yet</p>
          )}
          {tokens.map(t => (
            <div key={t.id} style={styles.tokenRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.tokenSlug}>{t.slug}</p>
                <p style={styles.tokenMeta}>
                  {t.used ? '✓ used' : '○ unused'} ·{' '}
                  expires {new Date(t.expires_at).toLocaleDateString()}
                </p>
              </div>
              <div style={styles.tokenActions}>
                {!t.used && (
                  <button
                    onClick={() => copyLink(t.token)}
                    style={styles.copyBtn}
                  >
                    {copied === t.token ? '✓' : 'copy'}
                  </button>
                )}
                <button
                  onClick={() => revokeToken(t.id)}
                  style={styles.revokeBtn}
                >
                  revoke
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Active posts */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>this week's posts</p>
          {!loading && posts.length === 0 && (
            <p style={styles.empty}>no posts yet</p>
          )}
          {posts.map(p => (
            <div key={p.id} style={styles.tokenRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.tokenSlug}>{p.contributor}</p>
                <p style={styles.tokenMeta}>
                  {p.is_live ? '🟢 live' : '⚫ expired'} ·{' '}
                  {new Date(p.published_at).toLocaleDateString()}
                </p>
              </div>
              <div style={styles.tokenActions}>
                <button
                  onClick={() => router.push(`/s/${p.slug}`)}
                  style={styles.copyBtn}
                >view</button>
                {p.is_live && (
                  <button
                    onClick={() => wipePost(p.id)}
                    style={styles.revokeBtn}
                  >wipe</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button onClick={loadData} style={styles.refreshBtn}>
          refresh ↺
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
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 20px',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  watermark: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: '0.1em',
    margin: '0',
  },
  signOutBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '0',
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: '44px',
    color: '#fff',
    margin: '0 0 8px',
    fontWeight: '400',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
    margin: '0 0 32px',
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
  primaryBtn: {
    background: '#fff',
    color: '#0e0e0e',
    border: 'none',
    padding: '16px',
    borderRadius: '32px',
    fontSize: '18px',
    cursor: 'pointer',
    width: '100%',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    margin: '0 0 12px',
  },
  row: {
    display: 'flex',
    gap: '8px',
  },
  searchInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    padding: '10px 14px',
    outline: 'none',
  },
  generateBtn: {
    background: '#fff',
    color: '#0e0e0e',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  tokenRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 0',
    borderBottom: '0.5px solid rgba(255,255,255,0.08)',
  },
  tokenSlug: {
    fontSize: '14px',
    color: '#fff',
    margin: '0 0 3px',
  },
  tokenMeta: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
    margin: '0',
  },
  tokenActions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  copyBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '5px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  revokeBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,0,0,0.3)',
    color: 'rgba(255,100,100,0.7)',
    padding: '5px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  empty: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.2)',
    margin: '0',
    letterSpacing: '0.04em',
  },
  refreshBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.35)',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '13px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '8px',
  },
};