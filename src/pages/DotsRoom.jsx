import React from 'react';
import { useProfile } from '@/lib/ProfileContext';
import DotBoilAnimation from '@/components/dots/DotBoilAnimation';

// Dot's Room — a line-boil animation test. The animation is visible to every
// signed-in role; the playback controls are ADMIN/TESTER only.
export default function DotsRoom() {
  const { isTester } = useProfile();

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center px-4 py-10">
      <h1 className="mb-8 text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Dot&apos;s Room
      </h1>
      <DotBoilAnimation showControls={isTester} />
    </div>
  );
}