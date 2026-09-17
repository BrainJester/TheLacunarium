import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2 } from 'lucide-react';
import { GAMES } from '@/lib/rooms';
import { useProfile } from '@/lib/ProfileContext';

// Every player record shown on the admin screen. To add a new game's high
// score: add the field to the Profile entity, to RECORD_FIELDS in
// base44/shared/records.ts, to adminListProfiles' row, and one entry here.
const RECORDS = GAMES.map(g => ({ key: g.record, label: g.recordLabel, game: g.label }));

export default function AdminUserList() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState(null); // { id, field, value }
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);
  const { account } = useProfile();

  const load = async () => {
    try {
      const res = await base44.functions.invoke('adminListProfiles', {});
      setUsers(res.data || []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (u, field) => {
    setEdit({ id: u.id, field, value: String(u[field] || 0) });
    setConfirmId(null);
  };
  const cancelEdit = () => setEdit(null);

  const saveEdit = async (u) => {
    setBusy(true);
    try {
      await base44.functions.invoke('adminSetRecord', {
        profile_id: u.id,
        field: edit.field,
        value: Number(edit.value),
      });
      setEdit(null);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to update record');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (u) => {
    setBusy(true);
    try {
      await base44.functions.invoke('adminDeleteProfile', { profile_id: u.id });
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to delete profile');
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = async (u) => {
    const nextRole = u.site_role === 'tester' ? 'user' : 'tester';
    setBusy(true);
    try {
      await base44.functions.invoke('adminSetUserRole', { profile_id: u.id, role: nextRole });
      await load();
    } catch (e) {
      setError(e.message || 'Failed to update role');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div role="alert"><p>{error}</p><button className="underline" onClick={load}>Retry</button></div>;
  if (!users) return <p className="text-sm text-foreground/60">Loading players…</p>;
  if (!users.length) return <p className="text-sm text-foreground/60">No players yet.</p>;

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div key={u.id} className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{u.profile_name}</p>
              <p className="truncate text-xs text-foreground/60">{u.email || '—'}</p>
            </div>
            {u.site_role === 'admin' || u.user_id === account?.id ? (
              <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[9px] uppercase tracking-widest text-foreground/60">
                {u.site_role}
              </span>
            ) : (
              <button
                onClick={() => toggleRole(u)}
                disabled={busy}
                title="Toggle tester mode"
                className="shrink-0 rounded-full border border-border px-2 py-1 text-[9px] uppercase tracking-widest text-foreground transition hover:bg-foreground/10 disabled:opacity-50"
              >
                {u.site_role}
              </button>
            )}
          </div>

          {/* All game records for this player */}
          <div className="mt-3 space-y-2">
            {RECORDS.map((r) => {
              const isEditing = edit && edit.id === u.id && edit.field === r.key;
              return (
                <div key={r.key} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-foreground/50">{r.game}</p>
                    {isEditing ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="0" step="1"
                          value={edit.value}
                          onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                        />
                        <button
                          onClick={() => saveEdit(u)}
                          disabled={busy}
                          className="rounded-md bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-[10px] uppercase tracking-widest text-foreground/60 hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground">
                        <span className="text-foreground/60">{r.label} </span>
                        <span className="font-bold">{u[r.key] || 0}</span>
                      </p>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(u, r.key)}
                      className="shrink-0 text-[10px] uppercase tracking-widest text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Set
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Delete */}
          <div className="mt-3 flex justify-end">
            {confirmId === u.id ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => doDelete(u)}
                  disabled={busy}
                  className="rounded-md bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  Remove profile
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="text-[10px] uppercase tracking-widest text-foreground/60 hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setConfirmId(u.id); setEdit(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground/60 transition hover:border-foreground hover:text-foreground"
                aria-label={`Delete ${u.profile_name}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}