import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useProfile } from '@/lib/ProfileContext';
import GameCanvas from '@/components/game/GameCanvas';
import AudioManager from '@/components/game/AudioManager';

export default function PieceAndQuiet() {
  const { loading, error, isSignedIn, isTester, massRecord: storedRecord, refresh } = useProfile();
  const bestMassRef = useRef(storedRecord);
  const debounceRef = useRef(null);
  const [recordError, setRecordError] = useState(false);
  const submitRecord = useCallback(async () => {
    try {
      await base44.functions.invoke('updateMyMassRecord', { mass: bestMassRef.current });
      setRecordError(false); refresh();
    } catch { setRecordError(true); }
  }, [refresh]);

  useEffect(() => {
    bestMassRef.current = Math.max(bestMassRef.current, storedRecord);
  }, [storedRecord]);

  const handleMassChange = useCallback((m) => {
    if (m > bestMassRef.current) {
      bestMassRef.current = m;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { debounceRef.current = null; submitRecord(); }, 1500);
    }
  }, [submitRecord]);

  useEffect(() => () => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); base44.functions.invoke('updateMyMassRecord', { mass: bestMassRef.current }).catch(() => {}); }
  }, []);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-stone-500">Loading…</div>;
  }

  if (error) return <p className="p-8 text-center">Please retry loading your account using the message above.</p>;

  if (!isSignedIn) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Piece &amp; Quiet</h1>
        <p className="mt-4 text-stone-400">Sign in to begin your meditative island build.</p>
        <Link
          to="/login?returnTo=%2Fpiece-and-quiet"
          className="mt-8 inline-flex rounded-full bg-amber-300 px-8 py-4 text-xs font-bold uppercase tracking-[0.22em] text-stone-900 transition hover:bg-amber-200"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Tester tools are controlled by the server-provided role.
  const mode = isTester ? 'tester' : 'user';

  return (
    <div className="sm:px-4 sm:pb-4">
      <div className="relative h-[calc(100vh-5rem)] overflow-hidden border-y border-amber-200/15 bg-[#060e1f] sm:h-[calc(100vh-7rem)] sm:rounded-2xl sm:border">
        <GameCanvas mode={mode} onMassChange={handleMassChange} />
        <AudioManager active />
        {recordError && <button className="absolute left-3 top-14 z-50 bg-white p-2 text-xs" onClick={submitRecord}>Record not saved. Retry</button>}


      </div>
    </div>
  );
}
