import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useProfile } from './ProfileContext';
const sessionId = typeof crypto !== 'undefined' ? crypto.randomUUID() : 'browser-session';
export function usePresence() {
  const { pathname } = useLocation(), { isSignedIn } = useProfile();
  useEffect(() => {
    if (!isSignedIn) return;
    let pending = false;
    const ping = async () => {
      if (document.hidden || pending) return; pending = true;
      try { await base44.functions.invoke('pingPresence', { page: pathname, session_id: sessionId }); } catch { /* presence is advisory */ } finally { pending = false; }
    };
    ping(); const timer = setInterval(ping, 20000); document.addEventListener('visibilitychange', ping);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', ping); };
  }, [isSignedIn, pathname]);
}
