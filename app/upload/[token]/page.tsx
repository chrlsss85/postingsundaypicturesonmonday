'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface TrackResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

export default function UploadPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TrackResult[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<TrackResult | null>(null);
  const [caption, setCaption] = useState('');
  const [transition, setTransition] = useState('fade');
  const [showSongInfo, setShowSongInfo] = useState(true);
  const [showAudioCtrl, setShowAudioCtrl] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState('');
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  const handleNameNext = () => {
    if (!name.trim()) return;
    const generatedSlug = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '').substring(0, 20)
      + '-' + Math.random().toString(36).substring(2, 6);
    setSlug(generatedSlug);
    setStep(2);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length < 2 || files.length > 5) {
      alert('Please select between 2 and 5 photos.');
      return;
    }
    setPhotos(files);
    setPhotoPreviewUrls(files.map(f => URL.createObjectURL(f)));
  };

  const searchMusic = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=8&entity=song`
      );
      const data = await res.json();
      setSearchResults(data.results.filter((r: TrackResult) => r.previewUrl));
    } catch {
      alert('Search failed. Please try again.');
    }
    setIsSearching(false);
  };

  const handleSelectTrack = (track: TrackResult) => {
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }
    setSelectedTrack(track);
  };

  const handlePreviewTrack = (track: TrackResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
      return;
    }
    const audio = new Audio(track.previewUrl);
    audio.play();
    setPreviewAudio(audio);
    audio.onended = () => setPreviewAudio(null);
  };

  const handlePublish = async () => {
    if (!selectedTrack) return;
    setIsPublishing(true);

    try {
      const formData = new FormData();
      photos.forEach(p => formData.append('photos', p));
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.urls) throw new Error('Photo upload failed');

      const colorRes = await fetch('/api/color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.urls[0] }),
      });
      const colorData = await colorRes.json();

      const publishRes = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          slug,
          contributor: name,
          caption,
          photo_urls: uploadData.urls,
          track_preview_url: selectedTrack.previewUrl,
          track_name: selectedTrack.trackName,
          track_artist: selectedTrack.artistName,
          track_album_art: selectedTrack.artworkUrl100,
          dominant_color: colorData.color || '#1a1a1a',
          transition,
          show_song_info: showSongInfo,
          show_audio_ctrl: showAudioCtrl,
        }),
      });

      const publishData = await publishRes.json();
      if (!publishData.success) throw new Error('Publish failed');

      setPublishedSlug(publishData.slug);
      setPublished(true);
    } catch (err) {
      alert('Something went wrong. Please try again.');
      console.error(err);
    }

    setIsPublishing(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/s/${publishedSlug}`;
    if (navigator.share) {
      navigator.share({ title: 'PostingSundayPicturesOnMonday', url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  if (published) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.watermark}>PostingSundayPicturesOnMonday</p>
          <h1 style={styles.bigTitle}>it&apos;s live.</h1>
          <p style={styles.subtitle}>your sunday is out there.</p>
          <button onClick={handleShare} style={styles.primaryBtn}>share your post →</button>
          <button onClick={() => router.push(`/s/${publishedSlug}`)} style={styles.ghostBtn}>
            view your post
          </button>
          <p style={styles.expiry}>expires tuesday midnight</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <p style={styles.watermark}>PostingSundayPicturesOnMonday</p>
        <div style={styles.dots}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              ...styles.dot,
              background: i === step ? '#fff' : 'rgba(255,255,255,0.25)',
              width: i === step ? '18px' : '6px',
            }} />
          ))}
        </div>

        {step === 1 && (
          <div style={styles.stepWrap}>
            <h1 style={styles.bigTitle}>who are you<br />this sunday?</h1>
            <p style={styles.subtitle}>you&apos;ve been invited.</p>
            <input
              type="text"
              placeholder="your name or handle"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameNext()}
              style={styles.input}
            />
            <button onClick={handleNameNext} style={styles.primaryBtn} disabled={!name.trim()}>
              that&apos;s me →
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={styles.stepWrap}>
            <h1 style={styles.bigTitle}>your sunday<br />photos.</h1>
            <p style={styles.subtitle}>2–5 photos · taken today</p>
            <label style={styles.uploadZone}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
              {photoPreviewUrls.length === 0 ? (
                <div style={styles.uploadEmpty}>
                  <span style={styles.uploadIcon}>＋</span>
                  <span style={styles.uploadText}>tap to add photos</span>
                  <span style={styles.uploadHint}>jpg · heic · png</span>
                </div>
              ) : (
                <div style={styles.photoGrid}>
                  {photoPreviewUrls.map((url, i) => (
                    <div key={i} style={{
                      ...styles.photoThumb,
                      backgroundImage: `url(${url})`,
                    }} />
                  ))}
                </div>
              )}
            </label>
            <div style={styles.row}>
              <button onClick={() => setStep(1)} style={styles.ghostBtn}>← back</button>
              <button
                onClick={() => setStep(3)}
                style={photos.length >= 2 ? styles.primaryBtn : styles.disabledBtn}
                disabled={photos.length < 2}
              >next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={styles.stepWrap}>
            <h1 style={styles.bigTitle}>the soundtrack.</h1>
            <p style={styles.subtitle}>search for your song</p>
            <div style={styles.searchRow}>
              <input
                type="text"
                placeholder="song title or artist..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchMusic()}
                style={styles.searchInput}
              />
              <button onClick={searchMusic} style={styles.searchBtn}>
                {isSearching ? '...' : '↵'}
              </button>
            </div>
            {selectedTrack && (
              <div style={styles.selectedTrack}>
                <img src={selectedTrack.artworkUrl100} alt="" style={styles.albumArt} />
                <div>
                  <p style={styles.trackName}>{selectedTrack.trackName}</p>
                  <p style={styles.trackArtist}>{selectedTrack.artistName}</p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>✓</span>
              </div>
            )}
            <div style={styles.resultsList}>
              {searchResults.map(track => (
                <div
                  key={track.trackId}
                  onClick={() => handleSelectTrack(track)}
                  style={{
                    ...styles.resultItem,
                    background: selectedTrack?.trackId === track.trackId
                      ? 'rgba(255,255,255,0.15)' : 'transparent',
                  }}
                >
                  <img src={track.artworkUrl100} alt="" style={styles.albumArtSm} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.trackName}>{track.trackName}</p>
                    <p style={styles.trackArtist}>{track.artistName}</p>
                  </div>
                  <button
                    onClick={e => handlePreviewTrack(track, e)}
                    style={styles.previewBtn}
                  >
                    {previewAudio && selectedTrack?.trackId === track.trackId ? '■' : '▶'}
                  </button>
                </div>
              ))}
            </div>
            <div style={styles.row}>
              <button onClick={() => setStep(2)} style={styles.ghostBtn}>← back</button>
              <button
                onClick={() => setStep(4)}
                style={selectedTrack ? styles.primaryBtn : styles.disabledBtn}
                disabled={!selectedTrack}
              >next →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={styles.stepWrap}>
            <h1 style={styles.bigTitle}>make it<br />yours.</h1>
            <input
              type="text"
              placeholder="a title for this sunday..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              style={{ ...styles.input, marginBottom: '20px' }}
            />
            <p style={styles.label}>TRANSITION</p>
            <div style={styles.row}>
              {['fade', 'slide', 'instant'].map(t => (
                <button
                  key={t}
                  onClick={() => setTransition(t)}
                  style={transition === t ? styles.activeChip : styles.chip}
                >{t}</button>
              ))}
            </div>
            <div style={styles.toggleRow}>
              <div>
                <p style={styles.toggleLabel}>show song info</p>
                <p style={styles.toggleSub}>title &amp; artist visible</p>
              </div>
              <div
                onClick={() => setShowSongInfo(!showSongInfo)}
                style={{ ...styles.toggle, background: showSongInfo ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.18)' }}
              >
                <div style={{ ...styles.toggleKnob, left: showSongInfo ? '23px' : '3px' }} />
              </div>
            </div>
            <div style={styles.toggleRow}>
              <div>
                <p style={styles.toggleLabel}>show audio player</p>
                <p style={styles.toggleSub}>visible controls</p>
              </div>
              <div
                onClick={() => setShowAudioCtrl(!showAudioCtrl)}
                style={{ ...styles.toggle, background: showAudioCtrl ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.18)' }}
              >
                <div style={{ ...styles.toggleKnob, left: showAudioCtrl ? '23px' : '3px' }} />
              </div>
            </div>
            <div style={styles.row}>
              <button onClick={() => setStep(3)} style={styles.ghostBtn}>← back</button>
              <button
                onClick={handlePublish}
                style={isPublishing ? styles.disabledBtn : styles.primaryBtn}
                disabled={isPublishing}
              >
                {isPublishing ? 'publishing...' : 'go live →'}
              </button>
            </div>
          </div>
        )}
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
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  watermark: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: '0.1em',
    margin: '0 0 20px',
  },
  dots: {
    display: 'flex',
    gap: '5px',
    alignItems: 'center',
    marginBottom: '28px',
  },
  dot: {
    height: '6px',
    borderRadius: '3px',
    transition: 'all 0.25s ease',
  },
  stepWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  bigTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '38px',
    color: '#fff',
    margin: '0',
    fontWeight: '400',
    lineHeight: '1.05',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
    margin: '0 0 8px',
    letterSpacing: '0.02em',
  },
  input: {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.28)',
    color: '#fff',
    fontSize: '22px',
    padding: '6px 0 10px',
    outline: 'none',
    width: '100%',
    caretColor: 'white',
  },
  primaryBtn: {
    background: '#fff',
    color: '#0e0e0e',
    border: 'none',
    padding: '15px',
    borderRadius: '32px',
    fontSize: '18px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '8px',
  },
  ghostBtn: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.18)',
    padding: '12px 20px',
    borderRadius: '32px',
    fontSize: '15px',
    cursor: 'pointer',
  },
  disabledBtn: {
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.25)',
    border: 'none',
    padding: '15px',
    borderRadius: '32px',
    fontSize: '18px',
    cursor: 'not-allowed',
    width: '100%',
    marginTop: '8px',
  },
  uploadZone: {
    border: '1px dashed rgba(255,255,255,0.2)',
    borderRadius: '22px',
    minHeight: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  uploadEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  uploadIcon: {
    fontSize: '32px',
    color: 'rgba(255,255,255,0.22)',
  },
  uploadText: {
    fontSize: '18px',
    color: 'rgba(255,255,255,0.32)',
  },
  uploadHint: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.18)',
    letterSpacing: '0.05em',
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    padding: '12px',
    width: '100%',
  },
  photoThumb: {
    height: '80px',
    borderRadius: '10px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  searchRow: {
    display: 'flex',
    gap: '8px',
  },
  searchInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    padding: '10px 14px',
    outline: 'none',
  },
  searchBtn: {
    background: '#fff',
    color: '#0e0e0e',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 16px',
    fontSize: '18px',
    cursor: 'pointer',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  selectedTrack: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.25)',
  },
  albumArt: {
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  albumArtSm: {
    width: '38px',
    height: '38px',
    borderRadius: '6px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  trackName: {
    fontSize: '13px',
    color: '#fff',
    margin: '0 0 2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  trackArtist: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.45)',
    margin: '0',
  },
  previewBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    fontSize: '10px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  row: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  label: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.1em',
    margin: '0',
  },
  chip: {
    flex: 1,
    padding: '10px 4px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.42)',
    borderRadius: '14px',
    fontSize: '15px',
    cursor: 'pointer',
  },
  activeChip: {
    flex: 1,
    padding: '10px 4px',
    border: '1px solid rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: '14px',
    fontSize: '15px',
    cursor: 'pointer',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  toggleLabel: {
    fontSize: '16px',
    color: '#fff',
    margin: '0 0 2px',
  },
  toggleSub: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.32)',
    margin: '0',
  },
  toggle: {
    width: '46px',
    height: '26px',
    borderRadius: '13px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.25s',
    flexShrink: 0,
  },
  toggleKnob: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#0e0e0e',
    top: '3px',
    transition: 'left 0.25s',
  },
  expiry: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    margin: '8px 0 0',
    letterSpacing: '0.05em',
  },
};