import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardParticles from './layout/DashboardParticles';
import AddressSearch from './AddressSearch';
import LivePreview from './LivePreview';

const STATS = [
  { value: '8',     label: 'Verified Landmarks' },
  { value: '13',    label: 'Neighborhoods' },
  { value: '6',     label: 'Staging Styles' },
  { value: '100%',  label: 'Lowcountry Only' },
];

const PROOF_PILLS = [
  { icon: '⚡', text: '2 hrs saved per listing' },
  { icon: '📍', text: 'Verified landmark distances' },
  { icon: '🏆', text: '94% authenticity score achievable' },
];

export default function Hero() {
  const [address, setAddress] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '130px 24px 90px',
      background:
        'radial-gradient(ellipse 110% 70% at 50% -5%, rgba(0,60,90,0.6) 0%, transparent 62%),' +
        'radial-gradient(ellipse 55% 45% at 12% 72%, rgba(0,255,255,0.045) 0%, transparent 70%),' +
        'radial-gradient(ellipse 50% 45% at 90% 35%, rgba(255,0,255,0.045) 0%, transparent 70%),' +
        '#0a0a1f',
    }}>
      <DashboardParticles />

      {/* Scanline vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.022) 3px,rgba(0,0,0,0.022) 4px)',
      }} />

      {/* Corner brackets */}
      {([
        { top: 0, left: 0,   borderTop: '1px solid', borderLeft: '1px solid' },
        { top: 0, right: 0,  borderTop: '1px solid', borderRight: '1px solid' },
        { bottom: 0, left: 0,  borderBottom: '1px solid', borderLeft: '1px solid' },
        { bottom: 0, right: 0, borderBottom: '1px solid', borderRight: '1px solid' },
      ] as React.CSSProperties[]).map((style, i) => (
        <div key={i} style={{
          position: 'absolute', width: 44, height: 44,
          borderColor: 'rgba(0,255,255,0.38)',
          pointerEvents: 'none', zIndex: 2,
          ...style,
        }} />
      ))}

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 3,
        width: '100%', maxWidth: 860, margin: '0 auto', textAlign: 'center',
      }}>

        {/* ── Scarcity + trust badge row ── */}
        <div className="anim-fade-up d-100" style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
          {/* Scarcity */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '6px 16px',
            background: 'rgba(255,0,255,0.07)',
            border: '1px solid rgba(255,0,255,0.3)',
            borderRadius: 30,
          }}>
            <span className="dot-live" style={{ background: 'var(--magenta)', boxShadow: '0 0 8px var(--magenta)' }} />
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, color: 'var(--magenta)', letterSpacing: '.16em' }}>
              LIMITED BETA — SPOTS FILLING FAST
            </span>
          </div>

          {/* Trust badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '6px 16px',
            background: 'rgba(0,255,255,0.06)',
            border: '1px solid rgba(0,255,255,0.22)',
            borderRadius: 30,
          }}>
            <span style={{ fontSize: 11 }}>📍</span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, color: 'var(--cyan)', letterSpacing: '.14em' }}>
              BUILT IN MOUNT PLEASANT, SC
            </span>
          </div>
        </div>

        {/* ── Headline ── */}
        <h1 className="anim-fade-up d-200" style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(36px, 6vw, 72px)',
          lineHeight: 1.02,
          letterSpacing: '-.03em',
          margin: '0 0 8px',
        }}>
          <span style={{ color: 'var(--text-hi)' }}>Write Standout Charleston</span>
          <br />
          <span style={{ color: 'var(--text-hi)' }}>Listings in </span>
          <span className="shimmer-text">Seconds.</span>
        </h1>

        {/* ── Accent line ── */}
        <div className="anim-fade-in d-250" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <div style={{
            width: 140, height: 1,
            background: 'linear-gradient(90deg, transparent, var(--cyan), var(--magenta), transparent)',
            boxShadow: '0 0 14px rgba(0,255,255,0.45)',
          }} />
        </div>

        {/* ── Subheadline ── */}
        <p className="anim-fade-up d-300" style={{
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 300,
          fontSize: 'clamp(16px, 2vw, 19px)',
          color: 'var(--text-mid)',
          lineHeight: 1.75,
          maxWidth: 640,
          margin: '0 auto 12px',
        }}>
          The only AI trained exclusively on Lowcountry voice — with{' '}
          <span style={{ color: 'var(--cyan)', fontWeight: 500 }}>verified landmark distances</span>,{' '}
          <span style={{ color: 'var(--cyan)', fontWeight: 500 }}>hyper-local neighborhood intelligence</span>,{' '}
          and <span style={{ color: 'var(--cyan)', fontWeight: 500 }}>virtual staging</span> no generic tool can match.
        </p>

        {/* ── Urgency bar ── */}
        <div className="anim-fade-up d-300" style={{ marginBottom: 36 }}>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: 10,
            color: 'rgba(255,200,80,0.8)', letterSpacing: '.1em',
          }}>
            ↓ In a cooling 2026 market, standout copy wins listings. Start free today.
          </span>
        </div>

        {/* ── Proof pills ── */}
        <div className="anim-fade-up d-350" style={{
          display: 'flex', justifyContent: 'center', gap: 10,
          marginBottom: 38, flexWrap: 'wrap',
        }}>
          {PROOF_PILLS.map(p => (
            <div key={p.text} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0,255,255,0.14)',
              borderRadius: 20,
              fontFamily: 'DM Sans, sans-serif', fontSize: 12,
              color: 'var(--text-mid)',
            }}>
              <span style={{ fontSize: 12 }}>{p.icon}</span>
              {p.text}
            </div>
          ))}
        </div>

        {/* ── Address box ── */}
        <div className="anim-fade-up d-400" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{
            background: 'rgba(8,8,28,0.82)',
            border: '1px solid rgba(0,255,255,0.32)',
            borderRadius: 20,
            padding: 28,
            backdropFilter: 'blur(32px)',
            boxShadow:
              'inset 0 1px 0 rgba(0,255,255,0.08),' +
              '0 36px 90px rgba(0,0,0,0.6),' +
              '0 0 0 1px rgba(0,255,255,0.06),' +
              '0 0 60px rgba(0,255,255,0.04)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Top scan line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.5), transparent)',
            }} />

            <p style={{
              fontFamily: 'Space Mono, monospace', fontSize: 10,
              letterSpacing: '.16em', color: 'var(--cyan)',
              marginBottom: 14, textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="dot-live" />
              ENTER A CHARLESTON PROPERTY ADDRESS
            </p>

            <AddressSearch onAddressSelect={setAddress} onClear={() => setAddress('')} />

            <LivePreview address={address} />

            {!address && (
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 18,
                marginTop: 16, flexWrap: 'wrap',
              }}>
                {[
                  '↳ Auto neighborhood detect',
                  '↳ 8 verified landmarks',
                  '↳ Lowcountry vocabulary',
                ].map(h => (
                  <span key={h} style={{
                    fontFamily: 'Space Mono, monospace', fontSize: 9,
                    color: 'var(--text-ghost)', letterSpacing: '.06em',
                  }}>{h}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CTAs ── */}
        <div className="anim-fade-up d-500" style={{
          display: 'flex', justifyContent: 'center', gap: 12,
          marginTop: 28, flexWrap: 'wrap',
        }}>
          {user ? (
            <>
              <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ fontSize: 15, padding: '15px 36px' }}>
                🌿 Go to Dashboard
              </button>
              <button type="button" onClick={() => navigate('/account')} className="btn btn-ghost" style={{ fontSize: 15 }}>
                View Plans & Billing ↓
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="btn btn-primary" style={{ fontSize: 15, padding: '15px 36px' }}>
                🌿 Start Free — 10 Listings/mo
              </a>
              <a href="#pricing" className="btn btn-ghost" style={{ fontSize: 15 }}>
                View Pricing ↓
              </a>
            </>
          )}
        </div>

        <p className="anim-fade-up d-500" style={{
          fontFamily: 'Space Mono, monospace', fontSize: 9,
          color: 'var(--text-ghost)', letterSpacing: '.12em',
          marginTop: 14,
        }}>
          No credit card required · Charleston, Berkeley &amp; Dorchester counties only
        </p>

        {/* ── Stats row ── */}
        <div className="anim-fade-up d-600" style={{
          display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
          gap: 0, marginTop: 52,
          background: 'rgba(0,255,255,0.03)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 14,
          padding: '20px 0',
          maxWidth: 560, marginLeft: 'auto', marginRight: 'auto',
        }}>
          {STATS.map(({ value, label }, i) => (
            <div key={label} style={{
              flex: '1 1 110px',
              textAlign: 'center',
              padding: '8px 20px',
              borderRight: i < STATS.length - 1 ? '1px solid rgba(0,255,255,0.1)' : 'none',
            }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26,
                color: 'var(--cyan)', lineHeight: 1,
                textShadow: '0 0 20px rgba(0,255,255,0.5)',
              }}>{value}</div>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: 8.5,
                color: 'var(--text-lo)', letterSpacing: '.14em',
                marginTop: 4, textTransform: 'uppercase',
              }}>{label}</div>
            </div>
          ))}
        </div>

      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, zIndex: 3,
      }}>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 8, color: 'var(--text-ghost)', letterSpacing: '.22em' }}>
          SCROLL
        </span>
        <div style={{
          width: 1, height: 34,
          background: 'linear-gradient(to bottom, var(--cyan), transparent)',
          boxShadow: '0 0 8px rgba(0,255,255,0.4)',
        }} />
      </div>
    </section>
  );
}
