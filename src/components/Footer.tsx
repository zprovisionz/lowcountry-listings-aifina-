import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PRODUCT_LINKS  = ['Features','Pricing','Virtual Staging','Authenticity Scoring','Team Accounts','Analytics'];
const COMPANY_LINKS  = ['About','Blog','Privacy Policy','Terms of Service','Contact'];
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
          'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,40,65,0.7) 0%, transparent 68%),' +
          'radial-gradient(ellipse 40% 40% at 50% 50%, rgba(0,255,255,0.055) 0%, transparent 65%),' +
          '#0a0a1f',
      }}>
        {/* Corner brackets */}
        {([
          { top: 40, left: 40,  borderTop: '1px solid', borderLeft: '1px solid' },
          { top: 40, right: 40, borderTop: '1px solid', borderRight: '1px solid' },
        ] as React.CSSProperties[]).map((s, i) => (
          <div key={i} style={{
            position: 'absolute', width: 28, height: 28,
            borderColor: 'rgba(0,255,255,0.3)',
            ...s, pointerEvents: 'none',
          }} />
        ))}

        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>

          {/* Urgency pill */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 18px',
              background: 'rgba(255,0,255,0.07)',
              border: '1px solid rgba(255,0,255,0.28)',
              borderRadius: 30,
            }}>
              <span className="dot-live" style={{ background: 'var(--magenta)', boxShadow: '0 0 8px var(--magenta)' }} />
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: 9.5,
                color: 'var(--magenta)', letterSpacing: '.15em',
              }}>
                COOLING MARKET · LIMITED BETA SPOTS REMAINING
              </span>
            </div>
          </div>

          <div className="tag">Get Started</div>

          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
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
            In a cooling 2026 Lowcountry market, listings with standout copy
            close faster. Start free in under 60 seconds — no credit card required.
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
                  🌿 Start Free — 10 Listings/mo
                </a>
                <a href="#pricing" className="btn btn-accent" style={{ fontSize: 16, padding: '16px 38px' }}>
                  View All Plans →
                </a>
              </>
            )}
          </div>

          <p style={{
            fontFamily: 'Space Mono, monospace', fontSize: 9,
            color: 'var(--text-ghost)', letterSpacing: '.14em',
          }}>
            10 free generations · No credit card · Charleston metro only
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
                fontFamily: 'Space Mono, monospace', fontSize: 10,
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
      <footer style={{ padding: '56px 28px 36px', background: 'rgba(5,5,18,0.9)' }}>
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
                  background: 'linear-gradient(135deg, rgba(0,255,255,0.15), rgba(255,0,255,0.12))',
                  border: '1px solid rgba(0,255,255,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                  boxShadow: '0 0 12px rgba(0,255,255,0.18)',
                }}>🌿</div>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text-hi)' }}>
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
                background: 'rgba(0,255,255,0.04)',
                border: '1px solid rgba(0,255,255,0.12)',
                borderRadius: 8, marginBottom: 10,
              }}>
                <span style={{ fontSize: 13 }}>📍</span>
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 9,
                  color: 'var(--cyan)', letterSpacing: '.1em',
                }}>
                  Built in Mount Pleasant, SC
                </span>
              </div>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: 9,
                color: 'var(--text-ghost)', letterSpacing: '.1em',
              }}>
                Charleston · Berkeley · Dorchester
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 11,
                color: 'var(--text-mid)', margin: '0 0 16px', letterSpacing: '.12em',
              }}>PRODUCT</h4>
              {PRODUCT_LINKS.map(item => (
                <a key={item} href="#" style={{
                  display: 'block', fontSize: 12.5, color: 'var(--text-lo)',
                  textDecoration: 'none', marginBottom: 9, transition: 'color .2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-lo)'}
                >{item}</a>
              ))}
            </div>

            {/* Neighborhoods */}
            <div>
              <h4 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 11,
                color: 'var(--text-mid)', margin: '0 0 16px', letterSpacing: '.12em',
              }}>NEIGHBORHOODS</h4>
              {NEIGHBORHOODS.map(n => (
                <div key={n} style={{
                  fontSize: 11, color: 'var(--text-ghost)',
                  fontFamily: 'Space Mono, monospace', marginBottom: 7,
                }}>
                  {n}
                </div>
              ))}
            </div>

            {/* Company */}
            <div>
              <h4 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 11,
                color: 'var(--text-mid)', margin: '0 0 16px', letterSpacing: '.12em',
              }}>COMPANY</h4>
              {COMPANY_LINKS.map(item => (
                <a key={item} href="#" style={{
                  display: 'block', fontSize: 12.5, color: 'var(--text-lo)',
                  textDecoration: 'none', marginBottom: 9, transition: 'color .2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-lo)'}
                >{item}</a>
              ))}
            </div>
          </div>

          <div className="divider" style={{ marginBottom: 24 }} />

          {/* Bottom bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-ghost)' }}>
              © 2026 Lowcountry Listings AI · Built in Mount Pleasant, SC · Charleston-tested, Charleston-built
            </span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-ghost)' }}>
              OpenAI · Google Maps · fal.ai · Supabase · Stripe
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
