import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

type Mode = 'signin' | 'signup' | 'forgot';

export default function LoginPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { toast } = useToast();

  const [mode,     setMode]     = useState<Mode>('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const redirectQuery = searchParams.get('redirect');
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? redirectQuery ?? '/dashboard';

  useEffect(() => { if (user) navigate(from, { replace: true }); }, [user, navigate, from]);

  const handleEmail = async () => {
    if (!email || (!password && mode !== 'forgot')) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUpWithEmail(email, password);
        if (error) throw error;
        toast('Account created! Check your email to verify.', 'success');
        setMode('signin');
      } else if (mode === 'signin') {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
      } else {
        const { error } = await import('../../lib/supabase').then(m => m.resetPassword(email));
        if (error) throw error;
        toast('Password reset email sent!', 'success');
        setMode('signin');
      }
    } catch (err: unknown) {
      toast((err as Error)?.message ?? 'An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (redirectQuery) try { sessionStorage.setItem('auth_redirect', redirectQuery); } catch (_) {}
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: unknown) {
      toast((err as Error)?.message ?? 'Google sign-in failed.', 'error');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background:
        'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,50,80,0.5) 0%, transparent 65%),' +
        'radial-gradient(ellipse 40% 40% at 10% 80%, rgba(0,255,255,0.04) 0%, transparent 70%),' +
        '#0a0a1f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Scanline */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.018) 3px, rgba(0,0,0,0.018) 4px)',
        zIndex: 0,
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56,
            background: 'linear-gradient(135deg, rgba(0,255,255,0.15), rgba(255,0,255,0.12))',
            border: '1px solid rgba(0,255,255,0.4)',
            borderRadius: 14, fontSize: 26, marginBottom: 14,
            boxShadow: '0 0 24px rgba(0,255,255,0.2)',
          }}>🌿</div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24,
            color: '#eafaff', margin: '0 0 4px',
          }}>
            Lowcountry <span style={{ color: 'var(--cyan)' }}>AI</span>
          </h1>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.16em' }}>
            CHARLESTON, SC — EXCLUSIVELY
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(8,8,28,0.85)',
          border: '1px solid rgba(0,255,255,0.2)',
          borderRadius: 20,
          padding: '32px 32px',
          backdropFilter: 'blur(28px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,255,255,0.06)',
        }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', marginBottom: 28,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(0,255,255,0.1)',
            borderRadius: 10, padding: 3,
          }}>
            {(['signin', 'signup'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px 0',
                background: mode === m ? 'rgba(0,255,255,0.1)' : 'transparent',
                border: mode === m ? '1px solid rgba(0,255,255,0.3)' : '1px solid transparent',
                borderRadius: 8,
                color: mode === m ? 'var(--cyan)' : 'var(--text-lo)',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', transition: 'all .2s ease',
              }}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading} style={{
            width: '100%', padding: '12px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all .2s ease', marginBottom: 20,
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 14, color: '#e0ffff' }}>
              Continue with Google
            </span>
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,255,255,0.1)' }} />
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-ghost)', letterSpacing: '.12em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,255,255,0.1)' }} />
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmail()}
                placeholder="agent@charlestonrealty.com"
                style={inputStyle}
                onFocus={e  => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,255,255,0.08)'; }}
                onBlur={e   => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.22)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            {mode !== 'forgot' && (
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEmail()}
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={e  => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,255,255,0.08)'; }}
                  onBlur={e   => { e.currentTarget.style.borderColor = 'rgba(0,255,255,0.22)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            )}
          </div>

          <button
            onClick={handleEmail}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: 14, padding: '13px', justifyContent: 'center', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? (
              <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:14,height:14,border:'1.5px solid rgba(0,255,255,.3)',borderTopColor:'var(--cyan)',borderRadius:'50%',animation:'spinRing .7s linear infinite',display:'inline-block' }} />
                {mode === 'forgot' ? 'Sending…' : mode === 'signup' ? 'Creating…' : 'Signing in…'}
              </span>
            ) : (
              mode === 'forgot' ? 'Send Reset Email' : mode === 'signup' ? 'Create Account →' : 'Sign In →'
            )}
          </button>

          {mode === 'signin' && (
            <button onClick={() => setMode('forgot')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-lo)', fontFamily: 'Space Mono, monospace',
              fontSize: 10, letterSpacing: '.08em', marginTop: 12, display: 'block', width: '100%',
              textAlign: 'center',
            }}>
              Forgot password?
            </button>
          )}
        </div>

        <p style={{
          textAlign: 'center', marginTop: 20,
          fontFamily: 'Space Mono, monospace', fontSize: 9,
          color: 'var(--text-ghost)', letterSpacing: '.08em',
        }}>
          Charleston · Berkeley · Dorchester counties only · Phase 1
        </p>
      </div>
      <style>{`@keyframes spinRing { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display:'block', fontFamily:'Space Mono, monospace', fontSize:9, letterSpacing:'.14em', color:'var(--text-lo)', textTransform:'uppercase', marginBottom:6 };
const inputStyle: React.CSSProperties = { width:'100%', padding:'11px 14px', background:'rgba(5,7,24,.9)', border:'1px solid rgba(0,255,255,.22)', borderRadius:9, color:'var(--text-hi)', fontFamily:'DM Sans, sans-serif', fontSize:14, outline:'none', transition:'border-color .2s, box-shadow .2s', caretColor:'var(--cyan)', boxSizing:'border-box' };
