import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [isLoadingAuth, setLoading] = useState(true), [authError, setError] = useState(null);
  const sequence = useRef(0);
  const checkUserAuth = useCallback(async () => {
    const id = ++sequence.current; setLoading(true); setError(null);
    try { const account = await base44.auth.me(); if (!account?.id) throw Error('Invalid account response.'); if (id === sequence.current) setUser(account); }
    catch (error) {
      if (id !== sequence.current) return;
      const status = error.status || error.response?.status;
      if (status === 401 || status === 403) setUser(null);
      else setError({ type: 'unavailable', message: 'Sign-in could not be checked. Please try again.' });
    } finally { if (id === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => { checkUserAuth(); return () => { sequence.current++; }; }, [checkUserAuth]);
  const logout = useCallback(() => { sequence.current++; setUser(null); base44.auth.logout(window.location.origin + '/'); }, []);
  const value = { user, isAuthenticated: !!user, isLoadingAuth, isLoadingPublicSettings: false, authChecked: !isLoadingAuth, authError, checkUserAuth, checkAppState: checkUserAuth, logout, navigateToLogin: () => { window.location.href = '/login'; } };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw Error('Missing AuthProvider'); return context; }
