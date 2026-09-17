import { Link } from 'react-router-dom';
import { useLeaderboards } from '@/lib/useLeaderboards';
const medals = ['🥇', '🥈', '🥉'];
export default function TickerBar() {
  const { data } = useLeaderboards();
  const entries = [
    { text: 'Welcome to the Lacunarium', route: '/' },
    { text: 'Coming soon · Apartments & new creations', route: '/' },
    ...(data?.flatMap(game => game.scores.slice(0, 3).map((score, index) => ({ text: `${medals[index]} ${game.label}: ${score.profile_name} — ${score.mass ?? score.red_queen_score}`, route: game.route }))) || []),
  ];
  return <div className="site-ticker" aria-label="Announcements and top three game scores"><div className="ticker-track" style={{ '--ticker-duration': `${Math.max(28, entries.length * 8)}s` }}>
    {[0, 1].map(copy => <div className="ticker-copy" key={copy} aria-hidden={copy ? true : undefined}>{entries.map((entry, index) => <Link key={index} tabIndex={copy ? -1 : undefined} to={entry.route}>{entry.text}<span aria-hidden="true"> ✦ </span></Link>)}</div>)}
  </div></div>;
}
