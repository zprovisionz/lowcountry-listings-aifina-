import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing',  href: '#pricing' },
  { label: 'Reviews',  href: '#testimonials' },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [activeLink, setActiveLink] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 48);
      // Highlight active section
      const sections = ['features', 'pricing', 'testimonials'];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom > 100) { setActiveLink(id); break; }
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        padding: scrolled ? '10px 0' : '18px 0',
        background: scrolled
          ? 'rgba(8, 8, 26, 0.94)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(24px) saturate(1.4)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,255,255,0.12)' : 'none',
        transition: 'all 0.4s var(--ease-expo)',
        animation: 'navFadeIn .6s ease both',
      }}>
        <style>{`
          @keyframes navFadeIn {
            from { transform: translateY(-20px); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        <div style={{
          maxWidth: 1240, margin: '0 auto',
          padding: '0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* ─ Logo ─ */}
          <a href="#" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, rgba(0,255,255,0.15) 0%, rgba(255,0,255,0.12) 100%)',
              border: '1px solid rgba(0,255,255,0.45)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 19,
              boxShadow: '0 0 14px rgba(0,255,255,0.2)',
              transition: 'box-shadow .3s ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(0,255,255,0.5)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 14px rgba(0,255,255,0.2)'}
            >
              🌿
            </div>
            <div>
              <span style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16,
                color: '#eafaff', letterSpacing: '-.01em',
                display: 'block', lineHeight: 1.1,
              }}>
                Lowcountry <span style={{ color: 'var(--cyan)' }}>AI</span>
              </span>
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: 8,
                color: 'var(--text-lo)', letterSpacing: '.14em',
              }}>
                CHARLESTON, SC
              </span>
            </div>
          </a>

          {/* ─ Desktop links ─ */}
          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {NAV_LINKS.map(({ label, href }) => {
              const id = href.replace('#', '');
              const isActive = activeLink === id;
              return (
                <a key={label} href={href} style={{
                  color: isActive ? 'var(--cyan)' : 'var(--text-mid)',
                  textDecoration: 'none',
                  fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13,
                  letterSpacing: '.04em',
                  transition: 'color .25s ease',
                  position: 'relative',
                  paddingBottom: 2,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = isActive ? 'var(--cyan)' : 'var(--text-mid)'}
                >
                  {label}
                  {/* Active underline */}
                  <span style={{
                    position: 'absolute', bottom: -2, left: 0, right: 0, height: 1,
                    background: 'var(--cyan)',
                    boxShadow: '0 0 6px var(--cyan)',
                    transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                    transition: 'transform .3s ease',
                    transformOrigin: 'left',
                  }} />
                </a>
              );
            })}
          </div>

          {/* ─ CTA row ─ */}
          <div className="nav-cta" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user ? (
              <>
                <button type="button" onClick={() => navigate('/account')} className="btn btn-ghost btn-sm">Account</button>
                <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-primary btn-sm">Dashboard →</button>
              </>
            ) : (
              <>
                <a href="/login" className="btn btn-ghost btn-sm">Sign In</a>
                <a href="/login" className="btn btn-primary btn-sm">Start Free →</a>
              </>
            )}
          </div>

          {/* ─ Mobile hamburger ─ */}
          <button
            className="nav-burger"
            onClick={() => setMenuOpen(m => !m)}
            style={{
              display: 'none', background: 'transparent', border: 'none',
              color: 'var(--cyan)', cursor: 'pointer', padding: 6,
              fontSize: 20, lineHeight: 1,
            }}
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* ─ Mobile menu ─ */}
        {menuOpen && (
          <div style={{
            padding: '20px 28px',
            borderTop: '1px solid rgba(0,255,255,0.12)',
            background: 'rgba(6,6,22,0.98)',
            backdropFilter: 'blur(24px)',
            display: 'flex', flexDirection: 'column', gap: 16,
            animation: 'fadeUp .25s ease',
          }}>
            {NAV_LINKS.map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setMenuOpen(false)} style={{
                color: 'var(--text-mid)', textDecoration: 'none',
                fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 16,
              }}>
                {label}
              </a>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {user ? (
                <>
                  <button type="button" onClick={() => { setMenuOpen(false); navigate('/account'); }} className="btn btn-ghost btn-sm">Account</button>
                  <button type="button" onClick={() => { setMenuOpen(false); navigate('/dashboard'); }} className="btn btn-primary btn-sm">Dashboard →</button>
                </>
              ) : (
                <>
                  <a href="/login" className="btn btn-ghost btn-sm">Sign In</a>
                  <a href="/login" className="btn btn-primary btn-sm">Start Free →</a>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop, .nav-cta { display: none !important; }
          .nav-burger { display: block !important; }
        }
      `}</style>
    </>
  );
}
