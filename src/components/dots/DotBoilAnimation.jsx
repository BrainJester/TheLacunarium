import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image } from '@/components/ui/image';
import { Play, Pause, SkipForward, Repeat } from 'lucide-react';

// The two line-boil frames, shown in exact sequence with no crossfade.
const FRAMES = [
  '/assets/b5b1c1b9546a804a.png',
  '/assets/e2373adb931a6161.png',
];

// A "cycle" is one full pass through the sequence (frame 1 → frame 2).
// After each completed cycle the displayed height toggles between normal
// (100%) and image height × 0.95, and repeats indefinitely.
export default function DotBoilAnimation({ showControls = false }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [loop, setLoop] = useState(true);
  const [frameMs, setFrameMs] = useState(800);
  const [squished, setSquished] = useState(false);

  // Keep a ref of `loop` so the advance callback reads the latest value
  // without re-subscribing the interval on every toggle.
  const loopRef = useRef(loop);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  const advance = useCallback(() => {
    setFrameIndex((prev) => {
      const next = prev + 1;
      if (next >= FRAMES.length) {
        // Cycle complete — toggle the height squish.
        setSquished((s) => !s);
        if (!loopRef.current) {
          setPlaying(false);
          return prev; // hold on the last frame when looping is off
        }
        return 0;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(advance, frameMs);
    return () => clearInterval(id);
  }, [playing, frameMs, advance]);

  // Step forward pauses the loop and advances exactly one frame.
  const stepForward = () => {
    setPlaying(false);
    advance();
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative h-[58vh] max-h-[620px] w-full max-w-[560px] overflow-hidden bg-white"
        style={{
          transform: `scaleY(${squished ? 0.95 : 1})`,
          transformOrigin: 'bottom center',
          transition: 'none',
        }}
      >
        {FRAMES.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{ opacity: i === frameIndex ? 1 : 0, transition: 'none' }}
          >
            <Image
              src={src}
              fittingType="fit"
              className="h-full w-full"
              alt={`Dot idle frame ${i + 1}`}
            />
          </div>
        ))}
      </div>

      {showControls && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-border bg-background px-5 py-4 sm:gap-4">
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background transition hover:bg-foreground/10 active:scale-95"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <button
            onClick={stepForward}
            aria-label="Step forward one frame"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background transition hover:bg-foreground/10 active:scale-95"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <button
            onClick={() => setLoop((l) => !l)}
            aria-label={loop ? 'Loop on' : 'Loop off'}
            className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 transition active:scale-95"
            style={{
              background: loop ? 'hsl(var(--foreground))' : 'hsl(var(--background))',
              color: loop ? 'hsl(var(--background))' : 'hsl(var(--foreground))',
            }}
          >
            <Repeat className="h-4 w-4" />
            <span className="text-[11px] font-mono uppercase tracking-widest">
              {loop ? 'Loop' : '1×'}
            </span>
          </button>

          <label className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-widest text-foreground/70">
            <span>Frame speed</span>
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={frameMs}
              onChange={(e) => setFrameMs(Number(e.target.value))}
              className="w-32 accent-foreground"
            />
            <span className="w-12 tabular-nums">{frameMs}ms</span>
          </label>
        </div>
      )}
    </div>
  );
}