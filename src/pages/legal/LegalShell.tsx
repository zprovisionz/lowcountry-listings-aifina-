import { Link } from 'react-router-dom';

export default function LegalShell({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,50,80,0.4) 0%, transparent 65%), #0a0a1f',
      padding: '60px 24px 100px',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link to="/" style={{
          fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 11,
          color: 'var(--cyan)', letterSpacing: '.14em', textDecoration: 'none',
        }}>
          ← Lowcountry AI
        </Link>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800,
          fontSize: 'clamp(32px, 5vw, 48px)', color: 'var(--text-hi)',
          margin: '24px 0 8px', lineHeight: 1.1, letterSpacing: '-.02em',
        }}>
          {title}
        </h1>
        <p style={{
          fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 10,
          color: 'var(--text-lo)', letterSpacing: '.12em', margin: '0 0 36px',
        }}>
          LAST UPDATED · {lastUpdated.toUpperCase()}
        </p>
        <div style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 15, lineHeight: 1.85,
          color: 'var(--text-mid)',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
