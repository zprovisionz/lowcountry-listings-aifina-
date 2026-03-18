import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

function getRedirectTarget(searchParams: URLSearchParams): string {
  const q = searchParams.get('redirect');
  if (q) return q;
  try {
    const stored = sessionStorage.getItem('auth_redirect');
    if (stored) { sessionStorage.removeItem('auth_redirect'); return stored; }
  } catch (_) {}
  return '/dashboard';
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [redirectTo] = useState(() => getRedirectTarget(searchParams));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? redirectTo : '/login', { replace: true });
    });
  }, [navigate, redirectTo]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a1f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <div style={{
        width: 44, height: 44,
        border: '2px solid rgba(0,255,255,0.2)',
        borderTopColor: 'var(--cyan)',
        borderRadius: '50%',
        animation: 'spinRing .8s linear infinite',
      }} />
      <span style={{
        fontFamily: 'Space Mono, monospace', fontSize: 11,
        color: 'var(--text-lo)', letterSpacing: '.16em',
      }}>
        COMPLETING SIGN IN…
      </span>
      <style>{`@keyframes spinRing { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
