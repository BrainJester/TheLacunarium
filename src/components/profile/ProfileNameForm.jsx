import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/lib/ProfileContext';

export default function ProfileNameForm({ initialValue = '', submitLabel = 'Save name', onSaved }) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { refresh } = useProfile();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await base44.functions.invoke('setProfileName', { profile_name: value });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        await refresh();
        if (onSaved) onSaved();
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save that name. Try another.');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your player name" aria-label="Profile name" maxLength={20}
        className="h-12 border-border bg-background text-base text-foreground placeholder:text-foreground/40"
      />
      <p className="text-xs text-foreground/60">3–20 characters. Letters, numbers and underscores. Must be unique.</p>
      {error && <p className="text-sm font-semibold text-foreground">{error}</p>}
      <Button
        type="submit"
        disabled={busy || !value.trim()}
        className="h-12 w-full bg-primary text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:bg-primary/90"
      >
        {busy ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}