import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider }  from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute    from './components/layout/ProtectedRoute';
import AppLayout         from './components/layout/AppLayout';
import SupabaseConfigMissing from './components/SupabaseConfigMissing';
import { isSupabaseConfigured } from './lib/supabase';

// Auth
import LoginPage    from './pages/auth/LoginPage';
import AuthCallback from './pages/auth/AuthCallback';

// App pages
import { DashboardPage } from './features/dashboard';
import { GeneratePage, ResultsPage } from './features/generate';
import { HistoryPage } from './features/history';
import { ReportsPage } from './features/reports';
import { TeamPage } from './features/team';
import AcceptInvitePage from './pages/team/AcceptInvitePage';
import { AccountPage } from './features/account';
import { BulkPage } from './features/bulk';
import { AnalyticsPage } from './features/analytics';

// Public
import LandingApp    from './LandingApp';
import PrivacyPage   from './pages/legal/PrivacyPage';
import TermsPage     from './pages/legal/TermsPage';
import NotFoundPage  from './pages/NotFoundPage';
import NeighborhoodsIndexPage from './pages/neighborhoods/NeighborhoodsIndexPage';
import NeighborhoodPage       from './pages/neighborhoods/NeighborhoodPage';

export default function App() {
  if (!isSupabaseConfigured) {
    return <SupabaseConfigMissing />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* ── Public ── */}
            <Route path="/"              element={<LandingApp />} />
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/privacy"       element={<PrivacyPage />} />
            <Route path="/terms"         element={<TermsPage />} />
            <Route path="/neighborhoods" element={<NeighborhoodsIndexPage />} />
            <Route path="/neighborhoods/:slug" element={<NeighborhoodPage />} />
            <Route path="/join"          element={<AcceptInvitePage />} />

            {/* ── Protected app ── */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard"       element={<DashboardPage />} />
              <Route path="/generate"        element={<GeneratePage />} />
              <Route path="/results/:id"     element={<ResultsPage />} />
              <Route path="/history"         element={<HistoryPage />} />
              <Route path="/reports"         element={<ReportsPage />} />
              <Route path="/team"            element={<TeamPage />} />
              <Route path="/account"         element={<AccountPage />} />
              <Route path="/bulk"            element={<BulkPage />} />
              <Route path="/analytics"       element={<AnalyticsPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
