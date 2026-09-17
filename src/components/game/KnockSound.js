import { isAudioMuted } from './audioState';

let audioCtx = null;

function getCtx() {
  if (isAudioMuted()) return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Soft, quiet knock with slight pitch variance so it never sounds stale
export function playKnockSound() {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Base ~150Hz, vary ±20% per knock
  const baseFreq = 150;
  const variance = 0.8 + Math.random() * 0.4;
  const freq = baseFreq * variance;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.09);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.07, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.13);
}