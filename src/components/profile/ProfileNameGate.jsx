import React from 'react';
import { motion } from 'framer-motion';
import { useProfile } from '@/lib/ProfileContext';
import ProfileNameForm from './ProfileNameForm';

export default function ProfileNameGate() {
  const { loading, error, isSignedIn, profile } = useProfile();

  if (error || loading || !isSignedIn || profile) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/80 p-5 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border bg-background p-7 shadow-2xl"
      >
        <p className="font-display text-[10px] uppercase tracking-[0.35em] text-foreground/60">Lacunarium</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Choose your profile name</h2>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-foreground/60">
          This is your public player identity across the Lacunarium. It's separate from your email or Google name.
        </p>
        <ProfileNameForm submitLabel="Claim name" />
      </motion.div>
    </div>
  );
}