import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a1f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 20,
      }}>
        <div style={{
          width: 44, height: 44,
          border: '2px solid rgba(0,255,255,0.15)',
          borderTopColor: 'var(--cyan)',
          borderRadius: '50%',
          animation: 'spinRing .8s linear infinite',
        }} />
        <span style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: 11, letterSpacing: '.14em', color: 'var(--text-lo)',
        }}>
          AUTHENTICATING…
        </span>
        <style>{`@keyframes spinRing { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
