import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background:
        'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,50,80,0.5) 0%, transparent 65%),' +
        'radial-gradient(ellipse 40% 40% at 10% 80%, rgba(0,255,255,0.04) 0%, transparent 70%),' +
        '#0a0a1f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{
          fontFamily: "'DM Mono', ui-monospace, monospace",
          fontSize: 11, letterSpacing: '.18em', color: 'var(--cyan)', marginBottom: 24,
        }}>
          ERR · 404 · PAGE NOT FOUND
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800,
          fontSize: 'clamp(40px, 8vw, 72px)', color: 'var(--text-hi)',
          margin: '0 0 18px', lineHeight: 1.05, letterSpacing: '-.03em',
        }}>
          This street isn't on the map.
        </h1>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: 'var(--text-mid)',
          lineHeight: 1.7, margin: '0 0 36px',
        }}>
          The page you're looking for either moved, was retired, or never existed in the
          Charleston metro to begin with.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary" style={{ fontSize: 14, padding: '13px 28px', textDecoration: 'none' }}>
            🌿 Back to Home
          </Link>
          <Link to="/dashboard" className="btn btn-ghost" style={{ fontSize: 14, padding: '13px 28px', textDecoration: 'none' }}>
            Open Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
