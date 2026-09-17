import { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from './AuthContext';
const ProfileContext = createContext(null);
export function ProfileProvider({ children }) {
  const { user, isLoadingAuth, authError } = useAuth(), cache = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['profile', user?.id], enabled: !!user, queryFn: async () => (await base44.functions.invoke('getMyProfile', {})).data, staleTime: 30000 });
  const refresh = useCallback(async () => { await cache.invalidateQueries({ queryKey: ['profile', user?.id] }); await cache.invalidateQueries({ queryKey: ['leaderboards'] }); }, [cache, user?.id]);
  const profile = user ? data?.profile || null : null, role = profile?.site_role || null;
  return <ProfileContext.Provider value={{ loading: isLoadingAuth || (!!user && isLoading), error: authError || error, account: user ? data?.account || user : null, profile, role, massRecord: profile?.mass_record || 0, isSignedIn: !!user, isTester: role === 'tester' || role === 'admin', isAdmin: role === 'admin', refresh }}>{children}</ProfileContext.Provider>;
}
export function useProfile() { const context = useContext(ProfileContext); if (!context) throw Error('Missing ProfileProvider'); return context; }
