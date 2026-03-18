import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStripe } from '../hooks/useStripe';

interface Tier {
  name: string;
  tierKey: string; // for Stripe: free | starter | pro | pro_plus
  monthly: number;
  annual: number;
  gens: string;
  staging: string;
  features: string[];
  excluded?: string[];
  bestFor: string;
  cta: string;
  color: 'neutral' | 'cyan' | 'magenta';
  popular?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Free', tierKey: 'free', monthly: 0, annual: 0,
    gens: '10 / month', staging: 'None',
    features: [
      'MLS descriptions (350–450 words)',
      'Google Places address search',
      'Neighborhood auto-detection',
      '3 of 8 landmark distances',
      'Basic analytics dashboard',
    ],
    excluded: ['Airbnb / social copy', 'Virtual staging', 'Bulk CSV'],
    bestFor: 'Testing & light users',
    cta: 'Start Free', color: 'neutral',
  },
  {
    name: 'Starter', tierKey: 'starter', monthly: 19, annual: 182,
    gens: '100 / month', staging: '10 credits / mo',
    features: [
      'MLS + Airbnb + Social copy',
      'All 8 landmark distances',
      'Authenticity & confidence scoring',
      'Bulk CSV generation',
      'Virtual staging (10 credits)',
      '+$0.75 per extra generation',
    ],
    bestFor: 'Solo moderate-volume agents',
    cta: 'Start Starter', color: 'cyan',
  },
  {
    name: 'Pro', tierKey: 'pro', monthly: 39, annual: 374,
    gens: 'Unlimited', staging: '40 credits / mo',
    features: [
      'Everything in Starter',
      'Unlimited generations',
      'Full staging (6 styles, 40 credits)',
      'Comparable listings (comps)',
      'Performance analytics',
      '+$5 / 10-pack staging credits',
    ],
    bestFor: 'High-volume solo agents',
    cta: 'Go Pro', color: 'cyan', popular: true,
  },
  {
    name: 'Pro+', tierKey: 'pro_plus', monthly: 59, annual: 566,
    gens: 'Unlimited', staging: '100 credits / mo',
    features: [
      'Everything in Pro',
      '100 staging credits / month',
      'Priority AI processing',
      'Advanced market reports',
      'Priority support',
      'Early feature access',
    ],
    bestFor: 'Luxury & investor agents',
    cta: 'Go Pro+', color: 'magenta',
  },
];

const PAY_PER_USE = [
  { label: 'Extra generation',       price: '$0.75' },
  { label: 'Extra staging credit',   price: '$0.75' },
  { label: '10-credit staging pack', price: '$5.00' },
  { label: '20-credit staging pack', price: '$10.00' },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const { user } = useAuth();
  const { createCheckoutSession, loading: stripeLoading } = useStripe();
  const navigate = useNavigate();

  const handleTierCta = (tierKey: string) => {
    if (!user) {
      navigate('/login?redirect=/account');
      return;
    }
    if (tierKey === 'free') {
      navigate('/account');
      return;
    }
    createCheckoutSession('subscription', tierKey);
  };

  const handleTeamCta = () => {
    if (!user) {
      navigate('/login?redirect=/account');
      return;
    }
    createCheckoutSession('subscription', 'team');
  };

  return (
    <section id="pricing" style={{
      padding: '110px 0',
      background:
        'radial-gradient(ellipse 70% 55% at 18% 50%, rgba(0,255,255,0.028) 0%, transparent 70%),' +
        'radial-gradient(ellipse 55% 50% at 85% 80%, rgba(255,0,255,0.028) 0%, transparent 70%),' +
        'linear-gradient(180deg, #0a0a1f 0%, #08082a 100%)',
    }}>
      <div className="section-inner">

        {/* Header */}
        <div className="section-header">
          <div className="tag">Pricing</div>
          <h2 className="section-heading">
            One Plan Pays for Itself
            <br />
            <span style={{ color: 'var(--magenta)' }}>on the First Listing.</span>
          </h2>
          <p className="section-sub">
            Freemium entry → tiered recurring → pay-per-use extras.
            Annual billing saves 20%. Cancel anytime.
          </p>

          {/* Annual toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 32 }}>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: 11,
              color: annual ? 'var(--text-lo)' : 'var(--text-hi)',
              transition: 'color .25s',
            }}>Monthly</span>

            <button onClick={() => setAnnual(a => !a)} style={{
              width: 52, height: 28, borderRadius: 14, padding: 0,
              background: annual
                ? 'linear-gradient(90deg, var(--cyan), var(--magenta))'
                : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.18)',
              cursor: 'pointer', position: 'relative', transition: 'background .3s',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: '#fff', position: 'absolute',
                top: 3, left: annual ? 28 : 3,
                transition: 'left .3s var(--ease-spring)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }} />
            </button>

            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: 11,
              color: annual ? 'var(--text-hi)' : 'var(--text-lo)',
              transition: 'color .25s',
            }}>Annual</span>

            {annual && (
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: 9,
                color: 'var(--cyan)', padding: '3px 10px',
                background: 'rgba(0,255,255,0.09)',
                border: '1px solid rgba(0,255,255,0.28)',
                borderRadius: 20, letterSpacing: '.1em',
              }}>SAVE 20%</span>
            )}
          </div>
        </div>

        {/* Cards grid — 4 tiers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14, alignItems: 'start',
        }}>
          {TIERS.map((tier) => {
            const displayPrice = annual && tier.annual > 0
              ? Math.round(tier.annual / 12)
              : tier.monthly;

            const border = tier.popular
              ? '1px solid rgba(0,255,255,0.65)'
              : tier.color === 'magenta'
                ? '1px solid rgba(255,0,255,0.3)'
                : tier.color === 'cyan'
                  ? '1px solid rgba(0,255,255,0.28)'
                  : '1px solid rgba(255,255,255,0.07)';

            const nameColor = tier.color === 'magenta'
              ? 'var(--magenta)'
              : tier.color === 'cyan'
                ? 'var(--cyan)'
                : 'var(--text-hi)';

            return (
              <div
                key={tier.name}
                className={tier.popular ? 'glass-featured' : ''}
                style={{
                  position: 'relative',
                  background: tier.popular ? undefined : 'rgba(10,10,32,0.68)',
                  border: tier.popular ? undefined : border,
                  borderRadius: tier.popular ? undefined : 18,
                  backdropFilter: tier.popular ? undefined : 'blur(22px)',
                  padding: '26px 22px',
                  transform: tier.popular ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform .35s var(--ease-expo), box-shadow .35s ease',
                }}
                onMouseEnter={e => {
                  if (!tier.popular) (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)';
                }}
                onMouseLeave={e => {
                  if (!tier.popular) (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
              >
                {/* Most Popular badge */}
                {tier.popular && (
                  <div style={{ textAlign: 'center', marginBottom: 14 }}>
                    <span className="badge-popular">MOST POPULAR</span>
                  </div>
                )}

                <h3 style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20,
                  color: nameColor, margin: '0 0 2px',
                }}>
                  {tier.name}
                </h3>
                <p style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 9,
                  color: 'var(--text-ghost)', letterSpacing: '.07em', margin: '0 0 18px',
                }}>
                  Best for: {tier.bestFor}
                </p>

                {/* Price */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    {tier.monthly > 0 && (
                      <span style={{
                        fontFamily: 'Space Mono, monospace', fontSize: 13,
                        color: 'var(--text-lo)', marginTop: 9,
                      }}>$</span>
                    )}
                    <span style={{
                      fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 50,
                      color: 'var(--text-hi)', lineHeight: 1,
                    }}>
                      {tier.monthly === 0 ? 'Free' : displayPrice}
                    </span>
                    {tier.monthly > 0 && (
                      <span style={{
                        fontFamily: 'Space Mono, monospace', fontSize: 11,
                        color: 'var(--text-lo)', marginTop: 'auto', marginBottom: 9,
                      }}>/mo</span>
                    )}
                  </div>
                  {annual && tier.annual > 0 && (
                    <div style={{
                      fontFamily: 'Space Mono, monospace', fontSize: 9,
                      color: 'var(--cyan)', marginTop: 3,
                    }}>
                      ${tier.annual}/yr · 20% saved
                    </div>
                  )}
                </div>

                {/* Quota badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 12px',
                    background: 'rgba(0,255,255,0.05)',
                    border: '1px solid rgba(0,255,255,0.13)',
                    borderRadius: 8,
                  }}>
                    <span style={{ fontSize: 12 }}>⚡</span>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--text-hi)' }}>
                      {tier.gens}
                    </span>
                  </div>
                  {tier.staging !== 'None' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '7px 12px',
                      background: 'rgba(255,0,255,0.04)',
                      border: '1px solid rgba(255,0,255,0.13)',
                      borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 12 }}>🏠</span>
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--text-hi)' }}>
                        {tier.staging}
                      </span>
                    </div>
                  )}
                </div>

                <div className="divider-subtle" style={{ marginBottom: 16 }} />

                {/* Features list */}
                <ul style={{ listStyle: 'none', margin: '0 0 22px', padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                  {(tier.excluded ?? []).map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'var(--text-ghost)', lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0, marginTop: 1 }}>✕</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  type="button"
                  onClick={() => handleTierCta(tier.tierKey)}
                  disabled={stripeLoading}
                  className={`btn ${tier.popular ? 'btn-primary' : tier.color === 'magenta' ? 'btn-accent' : tier.color === 'neutral' ? 'btn-ghost' : 'btn-primary'}`}
                  style={{ width: '100%', fontSize: 12.5, padding: '12px 14px', boxSizing: 'border-box', textAlign: 'center' }}
                >
                  {stripeLoading ? 'Opening…' : `${tier.cta} →`}
                </button>

                {tier.popular && (
                  <p style={{
                    fontFamily: 'Space Mono, monospace', fontSize: 8.5,
                    color: 'var(--text-ghost)', textAlign: 'center',
                    marginTop: 10, letterSpacing: '.06em',
                  }}>
                    Most Charleston agents choose Pro
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Team tier callout */}
        <div style={{
          marginTop: 20,
          padding: '24px 32px',
          background: 'rgba(255,0,255,0.04)',
          border: '1px solid rgba(255,0,255,0.2)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 18,
        }}>
          <div>
            <div style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17,
              color: 'var(--magenta)', marginBottom: 4,
            }}>
              Team Plan — $149/mo
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>
              Unlimited shared generations · 200 shared staging credits · Multi-user seats (3–15+) ·
              Owner/Editor/Viewer roles · Custom brokerage branding · Dedicated onboarding
            </div>
          </div>
          <button
            type="button"
            onClick={handleTeamCta}
            disabled={stripeLoading}
            className="btn btn-accent"
            style={{ fontSize: 13, padding: '12px 28px', whiteSpace: 'nowrap' }}
          >
            {stripeLoading ? 'Opening…' : 'Start Team Trial →'}
          </button>
        </div>

        {/* Pay-per-use */}
        <div style={{
          marginTop: 28, padding: '22px 32px',
          background: 'rgba(0,255,255,0.025)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 14, textAlign: 'center',
        }}>
          <h4 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14,
            color: 'var(--text-hi)', margin: '0 0 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span className="dot-live" />
            Pay-Per-Use Add-Ons
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 36, flexWrap: 'wrap' }}>
            {PAY_PER_USE.map(({ label, price }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 16, color: 'var(--cyan)', fontWeight: 700 }}>
                  {price}
                </div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', marginTop: 3, letterSpacing: '.08em' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
