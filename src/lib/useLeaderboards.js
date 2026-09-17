import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { GAMES } from './rooms';
export function useLeaderboards() {
  return useQuery({ queryKey: ['leaderboards'], staleTime: 30000, refetchInterval: 60000,
    queryFn: async () => Promise.all(GAMES.map(async game => ({ ...game, scores: (await base44.functions.invoke(game.leaderboard, {})).data }))) });
}
