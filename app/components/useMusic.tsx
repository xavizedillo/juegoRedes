'use client';

import { useEffect, useRef, useState } from 'react';

const MUSIC_VOLUME = 0.35;
const MUTED_KEY = 'rogueweb-music-muted';

export function useMusic(track: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(localStorage.getItem(MUTED_KEY) === '1');
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.loop = true;
      audio.volume = MUSIC_VOLUME;
      audioRef.current = audio;
    }
    if (audio.getAttribute('src') !== track) {
      audio.src = track;
    }
    audio.muted = muted;

    const tryPlay = () => {
      audio.play().catch(() => {});
    };
    tryPlay();

    // Los navegadores bloquean el audio hasta la primera interacción del usuario.
    window.addEventListener('pointerdown', tryPlay, { once: true });
    window.addEventListener('keydown', tryPlay, { once: true });
    return () => {
      window.removeEventListener('pointerdown', tryPlay);
      window.removeEventListener('keydown', tryPlay);
    };
  }, [track, muted]);

  const toggleMuted = () => {
    setMuted((current) => {
      localStorage.setItem(MUTED_KEY, current ? '0' : '1');
      return !current;
    });
  };

  return { muted, toggleMuted };
}

export function MusicToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={muted ? 'Activar música' : 'Silenciar música'}
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 1000,
        padding: '8px 12px',
        background: 'rgba(30, 20, 10, 0.9)',
        color: '#ffd700',
        border: '2px solid #c9a227',
        borderRadius: '4px',
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        cursor: 'pointer',
      }}
    >
      {muted ? '🔇 Música' : '🔊 Música'}
    </button>
  );
}
