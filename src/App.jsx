import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { ProfileProvider } from '@/lib/ProfileContext';
import SiteShell from '@/components/layout/SiteShell';
import ScrollToTop from '@/components/ScrollToTop';
import RouteErrorBoundary from '@/components/RouteErrorBoundary';
const Home = lazy(() => import('./pages/Home'));
const PieceAndQuiet = lazy(() => import('./pages/PieceAndQuiet'));
const RedQueen = lazy(() => import('./pages/RedQueen'));
const Profile = lazy(() => import('./pages/Profile'));
const HQ = lazy(() => import('./pages/HQ'));
const DotsRoom = lazy(() => import('./pages/DotsRoom'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PageNotFound = lazy(() => import('./lib/PageNotFound'));
export default function App() {
  return <QueryClientProvider client={queryClientInstance}><AuthProvider><ProfileProvider><BrowserRouter><ScrollToTop /><RouteErrorBoundary><Suspense fallback={<div className="p-12 text-center" role="status">Opening room…</div>}><Routes>
    <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
    <Route element={<SiteShell />}><Route path="/" element={<Home />} /><Route path="/piece-and-quiet" element={<PieceAndQuiet />} /><Route path="/red-queen" element={<RedQueen />} /><Route path="/profile" element={<Profile />} /><Route path="/hq" element={<HQ />} /><Route path="/dots-room" element={<DotsRoom />} /></Route>
    <Route path="*" element={<PageNotFound />} />
  </Routes></Suspense></RouteErrorBoundary></BrowserRouter><Toaster /></ProfileProvider></AuthProvider></QueryClientProvider>;
}
