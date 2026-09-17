import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useProfile } from '@/lib/ProfileContext';
import { useAuth } from '@/lib/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserRound, LogOut, Users } from 'lucide-react';

export default function AccountControl() {
  const { loading, isSignedIn, profile, account, isAdmin } = useProfile();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeHere, setActiveHere] = useState(null);

  // Presence is advisory; do not poll hidden tabs or overlap requests.
  useEffect(() => {
    if (!isAdmin) { setActiveHere(null); return; }
    let cancelled = false, pending = false;
    const fetchCount = async () => {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const res = await base44.functions.invoke('getActiveUsersOnPage', { page: location.pathname });
        if (!cancelled) setActiveHere(res.data?.active ?? 0);
      } catch {
        if (!cancelled) setActiveHere(null);
      } finally { pending = false; }
    };
    fetchCount();
    const id = setInterval(fetchCount, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isAdmin, location.pathname]);

  if (loading) {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-foreground/10" />;
  }

  if (!isSignedIn) {
    return (
      <Link
        to={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
        className="rounded-full border border-border bg-background px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition hover:bg-foreground/10"
      >
        Sign In
      </Link>
    );
  }

  const label = profile ? profile.profile_name : (account?.full_name || 'Account');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition hover:bg-foreground/10">
        <UserRound className="h-4 w-4 text-foreground" />
        <span className="max-w-[9rem] truncate font-medium">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 border-border bg-background text-foreground">
        {isAdmin && (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              {activeHere == null ? '…' : activeHere} user{activeHere === 1 ? '' : 's'} on this page
            </span>
          </div>
        )}
        <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer focus:bg-foreground/10 focus:text-foreground">
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer focus:bg-foreground/10 focus:text-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
