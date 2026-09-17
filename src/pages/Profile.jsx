import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useProfile } from '@/lib/ProfileContext';
import ProfileNameForm from '@/components/profile/ProfileNameForm';
import AdminUserList from '@/components/profile/AdminUserList';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

function Row({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">{label}</span>
      <span className="text-base text-foreground">{value}</span>
    </div>
  );
}

export default function Profile() {
  const { loading, isSignedIn, account, profile, isTester, isAdmin, refresh } = useProfile();
  const [editing, setEditing] = useState(false);

  // Re-fetch the latest records whenever the Profile page is opened so it
  // reflects the most recent game instead of a stale app-load snapshot.
  useEffect(() => { refresh(); }, [refresh]);

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-24 text-foreground/60">Loading…</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Your Profile</h1>
        <p className="mt-4 text-foreground/60">Sign in to create your player identity in the Lacunarium.</p>
        <Link
          to="/login?returnTo=%2Fprofile"
          className="mt-8 inline-flex rounded-full bg-primary px-8 py-4 text-xs font-bold uppercase tracking-[0.22em] text-primary-foreground transition hover:bg-primary/90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-6 sm:px-10">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Profile</h1>

      {isAdmin && (
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-foreground">
          <ShieldCheck className="h-4 w-4" /> Admin Access
        </div>
      )}

      <div className="mt-10">
        <Row label="Profile name" value={profile ? profile.profile_name : '—'} />
        <Row label="Email" value={account?.email || '—'} />
        <Row label="Account name" value={account?.full_name || '—'} />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-background p-6">
        <h2 className="font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">Piece &amp; Quiet - Island Size</h2>
        <p className="mt-2 text-5xl font-bold tracking-tight text-foreground">{profile ? (profile.mass_record || 0) : 0}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-background p-6">
        <h2 className="font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">Red Queen - Hearts Earned</h2>
        <p className="mt-2 text-5xl font-bold tracking-tight text-foreground">{profile ? (profile.red_queen_record || 0) : 0}</p>
      </div>

      {isAdmin && (
        <div className="mt-10 rounded-2xl border border-border bg-background p-6">
          <h2 className="font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">User Management</h2>
          <p className="mt-1 text-xs text-foreground/60">Manage testers and casual records. Removing a profile does not delete the account or saved island.</p>
          <div className="mt-5">
            <AdminUserList />
          </div>
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-border bg-background p-6">
        <h2 className="font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">Change profile name</h2>
        {editing ? (
          <div className="mt-5">
            <ProfileNameForm
              initialValue={profile ? profile.profile_name : ''}
              submitLabel="Update name"
              onSaved={() => setEditing(false)}
            />
            <button onClick={() => setEditing(false)} className="mt-3 w-full text-xs uppercase tracking-widest text-foreground/60 hover:text-foreground">
              Cancel
            </button>
          </div>
        ) : (
          <Button
            onClick={() => setEditing(true)}
            variant="outline"
            className="mt-4 border-border bg-background text-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            Edit name
          </Button>
        )}
      </div>


      <Button
        onClick={() => base44.auth.logout(window.location.origin + '/')}
        variant="ghost"
        className="mt-10 text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
      >
        Sign out
      </Button>
    </div>
  );
}