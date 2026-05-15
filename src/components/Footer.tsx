import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PLAN_LIMITS } from '../config';

const FREE_GENS = PLAN_LIMITS.free.generations;

const PRODUCT_LINKS: { label: string; href: string }[] = [
  { label: 'Features',             href: '/#features' },
  { label: 'Pricing',               href: '/#pricing' },
  { label: 'Virtual Staging',      href: '/#features' },
  { label: 'Authenticity Scoring', href: '/#features' },
  { label: 'Team Accounts',         href: '/#pricing' },
  { label: 'Use Cases',            href: '/#use-cases' },
];
const COMPANY_LINKS: { label: string; href: string }[] = [
  { label: 'FAQ',              href: '/#faq' },
  { label: 'Privacy Policy',   href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Contact',          href: 'mailto:hello@lowcountrylistings.ai' },
];
const NEIGHBORHOODS  = ['Downtown Charleston','Mount Pleasant','West Ashley','James Island','Isle of Palms','Folly Beach','Daniel Island','Summerville'];

export default function Footer() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {/* ─── Final urgency CTA ──────────────────────────────────────── */}
      <section style={{
        padding: '110px 28px',
        position: 'relative', overflow: 'hidden',
        background:
          'radial-gradient(ellipse 80% 70% at 50% 40%, oklch(0.72 0.13 195 / 0.1) 0%, transparent 60%),' +
          'radial-gradient(ellipse 45% 40% at 50% 80%, oklch(0.78 0.11 85 / 0.05) 0%, transparent 55%),' +
          'var(--space)',
      }}>
        {/* Corner brackets */}
        {([
          { top: 40, left: 40,  borderTop: '1px solid', borderLeft: '1px solid' },
          { top: 40, right: 40, borderTop: '1px solid', borderRight: '1px solid' },
        ] as React.CSSProperties[]).map((s, i) => (
          <div key={i} style={{
            position: 'absolute', width: 28, height: 28,
            borderColor: 'var(--cyan-border)',
            ...s, pointerEvents: 'none',
          }} />
        ))}

        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>

          {/* Locality pill */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 18px',
              background: 'var(--cyan-ghost)',
              border: '1px solid var(--cyan-border)',
              borderRadius: 30,
            }}>
              <span className="dot-live" />
              <span style={{
                fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9.5,
                color: 'var(--cyan)', letterSpacing: '.15em',
              }}>
                NOW SERVING THE CHARLESTON METRO
              </span>
            </div>
          </div>

          <div className="tag">Get Started</div>

          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800,
            fontSize: 'clamp(36px, 5.5vw, 62px)',
            color: 'var(--text-hi)', lineHeight: 1.0,
            letterSpacing: '-.03em', margin: '12px 0 22px',
          }}>
            Beat the Competition<br />
            <span className="shimmer-text">Before They Beat You.</span>
          </h2>

          <p style={{
            color: 'var(--text-mid)', fontSize: 17, lineHeight: 1.75,
            margin: '0 0 40px', maxWidth: 540, marginLeft: 'auto', marginRight: 'auto',
          }}>
            Charleston listings deserve copy that sounds like Charleston.
            Start free in under 60 seconds — no credit card required.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
            {user ? (
              <>
                <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ fontSize: 16, padding: '16px 38px' }}>
                  🌿 Go to Dashboard
                </button>
                <button type="button" onClick={() => navigate('/account')} className="btn btn-accent" style={{ fontSize: 16, padding: '16px 38px' }}>
                  View All Plans →
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="btn btn-primary" style={{ fontSize: 16, padding: '16px 38px' }}>
                  🌿 Start Free — {FREE_GENS} Listings/mo
                </a>
                <a href="#pricing" className="btn btn-accent" style={{ fontSize: 16, padding: '16px 38px' }}>
                  View All Plans →
                </a>
              </>
            )}
          </div>

          <p style={{
            fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9,
            color: 'var(--text-ghost)', letterSpacing: '.14em',
          }}>
            {FREE_GENS} free generations · No credit card · Charleston metro only
          </p>

          {/* Trust badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 40, flexWrap: 'wrap' }}>
            {[
              { icon: '🔒', label: 'Row-Level Security' },
              { icon: '⚡', label: 'GPT-4o Vision' },
              { icon: '🗺️', label: 'Google Maps API' },
              { icon: '📍', label: 'Mount Pleasant, SC' },
            ].map(({ icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 10,
                color: 'var(--text-lo)',
              }}>
                <span>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ─── Footer grid ──────────────────────────────────────────── */}
      <footer style={{ padding: '56px 28px 36px', background: 'var(--space-mid)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 40, marginBottom: 52,
          }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'linear-gradient(135deg, var(--cyan-ghost), var(--magenta-ghost))',
                  border: '1px solid var(--cyan-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                }}>🌿</div>
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 16, color: 'var(--text-hi)' }}>
                  Lowcountry <span style={{ color: 'var(--cyan)' }}>AI</span>
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-lo)', lineHeight: 1.75, margin: '0 0 12px' }}>
                AI-powered listing creation built exclusively for Charleston, SC
                real estate professionals.
              </p>
              {/* Founder credit */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 12px',
                background: 'var(--cyan-ghost)',
                border: '1px solid var(--cyan-border)',
                borderRadius: 8, marginBottom: 10,
              }}>
                <span style={{ fontSize: 13 }}>📍</span>
                <span style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9,
                  color: 'var(--cyan)', letterSpacing: '.1em',
                }}>
                  Built in Mount Pleasant, SC
                </span>
              </div>
              <div style={{
                fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9,
                color: 'var(--text-ghost)', letterSpacing: '.1em',
              }}>
                Charleston · Berkeley · Dorchester
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 style={{
                fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 11,
                color: 'var(--text-mid)', margin: '0 0 16px', letterSpacing: '.12em',
              }}>PRODUCT</h4>
              {PRODUCT_LINKS.map(({ label, href }) => (
                <a key={label} href={href} style={{
                  display: 'block', fontSize: 12.5, color: 'var(--text-lo)',
                  textDecoration: 'none', marginBottom: 9, transition: 'color .2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-lo)'}
                >{label}</a>
              ))}
            </div>

            {/* Neighborhoods */}
            <div>
              <h4 style={{
                fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 11,
                color: 'var(--text-mid)', margin: '0 0 16px', letterSpacing: '.12em',
              }}>NEIGHBORHOODS</h4>
              {NEIGHBORHOODS.map(n => (
                <div key={n} style={{
                  fontSize: 11, color: 'var(--text-ghost)',
                  fontFamily: "'DM Mono', ui-monospace, monospace", marginBottom: 7,
                }}>
                  {n}
                </div>
              ))}
            </div>

            {/* Company */}
            <div>
              <h4 style={{
                fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 11,
                color: 'var(--text-mid)', margin: '0 0 16px', letterSpacing: '.12em',
              }}>COMPANY</h4>
              {COMPANY_LINKS.map(({ label, href }) => (
                <a key={label} href={href} style={{
                  display: 'block', fontSize: 12.5, color: 'var(--text-lo)',
                  textDecoration: 'none', marginBottom: 9, transition: 'color .2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-lo)'}
                >{label}</a>
              ))}
            </div>
          </div>

          <div className="divider" style={{ marginBottom: 24 }} />

          {/* Bottom bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-ghost)' }}>
              © 2026 Lowcountry Listings AI · Built in Mount Pleasant, SC · Charleston-tested, Charleston-built
            </span>
            <span style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-ghost)' }}>
              OpenAI · Google Maps · fal.ai · Supabase · Stripe
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
