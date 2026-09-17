import { Outlet, Link } from 'react-router-dom';
import AccountControl from './AccountControl';
import TickerBar from './TickerBar';
import ProfileNameGate from '@/components/profile/ProfileNameGate';
import { usePresence } from '@/lib/usePresence';
import { useProfile } from '@/lib/ProfileContext';
import { useAuth } from '@/lib/AuthContext';
export default function SiteShell() {
  usePresence();
  const { error, refresh } = useProfile(), { authError, checkUserAuth } = useAuth();
  return <div className="min-h-screen bg-background text-foreground"><header className="site-header"><Link className="site-wordmark" to="/" aria-label="Home — floor 1, room 1">L</Link><TickerBar /><AccountControl /></header>
    <main className="site-main">{error && <div className="bg-amber-50 p-3 text-sm" role="alert">Your account could not be loaded. <button className="underline" onClick={() => authError ? checkUserAuth() : refresh()}>Retry</button></div>}<Outlet /></main><ProfileNameGate /></div>;
}
