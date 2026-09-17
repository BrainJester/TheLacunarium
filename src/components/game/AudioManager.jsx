import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { setAudioMuted } from './audioState';

const OCEAN_URL = '/assets/ae66e6339f957631.mp3';
const WHISPER_URLS = [
  '/assets/e98e22ca4087dd63.mp3',
  '/assets/80130b3311c0fc2e.mp3',
  '/assets/e4ac9e337ebf52b2.mp3',
];

export default function AudioManager({ active }) {
  const [muted, setMuted] = useState(false);
  const oceanRef = useRef(null);
  const whisperTimerRef = useRef(null);

  const whisperRef = useRef(null);
  const mutedRef = useRef(muted); mutedRef.current = muted;
  const playWhisper = useCallback(() => {
    if (mutedRef.current || !active) return;
    const url = WHISPER_URLS[Math.floor(Math.random() * WHISPER_URLS.length)];
    const audio = new Audio(url); whisperRef.current = audio;
    audio.volume = 0.15;
    audio.play().catch(() => {});
  }, [muted, active]);

  useEffect(() => {
    if (!active) return;

    // Ocean loop
    const ocean = new Audio(OCEAN_URL);
    ocean.loop = true;
    ocean.volume = 0.3;
    oceanRef.current = ocean;

    if (!muted) {
      ocean.play().catch(() => {});
    }

    // Whisper timer: random between 5-10 minutes
    const scheduleWhisper = () => {
      const delay = (5 + Math.random() * 5) * 60 * 1000;
      whisperTimerRef.current = setTimeout(() => {
        playWhisper();
        scheduleWhisper();
      }, delay);
    };
    scheduleWhisper();

    return () => {
      whisperRef.current?.pause();
      ocean.pause();
      ocean.src = '';
      oceanRef.current = null;
      if (whisperTimerRef.current) clearTimeout(whisperTimerRef.current);
    };
  }, [active]);

  useEffect(() => {
    setAudioMuted(muted);
    if (oceanRef.current) {
      if (muted) {
        whisperRef.current?.pause();
        oceanRef.current.pause();
      } else {
        oceanRef.current.play().catch(() => {});
      }
    }
  }, [muted]);

  if (!active) return null;

  return (
    <button
      aria-label={muted ? "Unmute island audio" : "Mute island audio"}
      onClick={() => setMuted(!muted)}
      className="absolute top-3 right-3 z-50 p-3 rounded-full bg-secondary/60 backdrop-blur-sm
        border border-border/30 text-foreground/60 hover:text-foreground/90
        transition-all duration-300 hover:bg-secondary/80"
    >
      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );
}