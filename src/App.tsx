import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }  from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute    from './components/layout/ProtectedRoute';
import AppLayout         from './components/layout/AppLayout';
import ErrorBoundary     from './components/ErrorBoundary';

// Auth
import LoginPage    from './pages/auth/LoginPage';
import AuthCallback from './pages/auth/AuthCallback';

// App pages
import { DashboardPage } from './features/dashboard';
import { GeneratePage, ResultsPage } from './features/generate';
import { HistoryPage } from './features/history';
import { ReportsPage } from './features/reports';
import { TeamPage } from './features/team';
import { AccountPage } from './features/account';
import { BulkPage } from './features/bulk';
import { AnalyticsPage } from './features/analytics';

// Landing (public)
import LandingApp from './LandingApp';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
          <Routes>
            {/* ── Public ── */}
            <Route path="/"              element={<LandingApp />} />
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

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

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
