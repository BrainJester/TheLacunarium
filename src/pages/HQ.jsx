import { Link } from 'react-router-dom';
import { useLeaderboards } from '@/lib/useLeaderboards';
export default function HQ() {
  const { data, isLoading, error, refetch } = useLeaderboards();
  return <div className="mx-auto max-w-3xl px-6 py-8"><h1 className="text-4xl font-semibold">HQ</h1><p className="mt-3 text-sm">Casual records from the Lacunarium. Scores are reported by players.</p>
    {isLoading && <p className="mt-6">Loading records…</p>}{error && <button className="my-6 underline" onClick={() => refetch()}>Records are unavailable. Retry</button>}
    {data?.map(game => <section className="mt-10" key={game.id}><h2 className="text-xl font-semibold"><Link to={game.route}>{game.label}</Link></h2><p className="text-sm text-gray-600">{game.recordLabel}</p><ol className="mt-4">{game.scores.map(score => <li key={score.rank} className="flex justify-between border-b py-3"><span>{score.rank}. {score.profile_name}</span><strong>{score.mass ?? score.red_queen_score}</strong></li>)}</ol>{!game.scores.length && <p className="py-4">No records yet.</p>}</section>)}
    <p className="mt-12">More rooms and creations are on the way.</p></div>;
}
