// ─────────────────────────────────────────────────────────────────────────────
//  UseCases.tsx — replaces Testimonials.tsx
//  Honest "Built for Charleston" section. No fabricated testimonials.
//  As real quotes come in, drop them into TESTIMONIALS array.
//  Layout: editorial 2-col split header, asymmetric use-case tiles,
//          capability stat bar at bottom.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

function useReveal<T extends HTMLElement>(threshold = 0.1) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.setAttribute('data-revealed', ''); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

type Accent = 'cyan' | 'magenta';

/** Stub for future real quotes (with consent). Not rendered until populated. */
export const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];

const USE_CASES: {
  icon: string;
  tag: string;
  accent: Accent;
  title: string;
  body: string;
}[] = [
  {
    icon: '🏡',
    tag: 'Listing Agents',
    accent: 'cyan',
    title: 'New listing, faster turnaround',
    body: 'Pull MLS-ready copy in under a minute — neighborhood detected, landmarks measured, amenities woven in. Spend the saved time on showings, not staring at a blank doc.',
  },
  {
    icon: '🌊',
    tag: 'STR Hosts',
    accent: 'cyan',
    title: 'Airbnb copy that sounds like Charleston',
    body: 'Dedicated Airbnb format calibrated for what guests actually search: walkability, tidal-creek sunrise views, Folly pier proximity. No generic "cozy retreat" filler.',
  },
  {
    icon: '🏛',
    tag: 'Brokerages',
    accent: 'magenta',
    title: 'Team accounts with shared quota',
    body: 'Owner / Editor / Viewer roles, a single shared generation pool, custom brokerage branding, and Stripe-managed billing — onboard a 3- to 15-agent team in an afternoon.',
  },
  {
    icon: '📍',
    tag: 'Luxury Agents',
    accent: 'magenta',
    title: 'Authenticity scoring + edit & regenerate',
    body: 'See a Lowcountry-authenticity score on every draft and a list of specific, actionable suggestions. Re-roll a section in one click — your inputs and amenities stay locked.',
  },
];

const CAPABILITIES = [
  { value: '8',    label: 'Verified landmarks' },
  { value: '13',   label: 'Neighborhood profiles' },
  { value: '6',    label: 'Staging styles' },
  { value: '< 60s', label: 'Typical generation time' },
];

function UseCase({ uc, index }: { uc: typeof USE_CASES[0]; index: number }) {
  const ref = useReveal<HTMLDivElement>(0.1);
  const isCyan = uc.accent === 'cyan';
  const color  = isCyan ? 'var(--cyan)'        : 'var(--magenta)';
  const ghost  = isCyan ? 'var(--cyan-ghost)'  : 'var(--magenta-ghost)';
  const border = isCyan ? 'var(--cyan-border)' : 'var(--magenta-border)';

  return (
    <div
      ref={ref}
      className="usecase-card"
      style={{ '--reveal-delay': `${index * 70}ms` } as CSSProperties}
    >
      <div className="usecase-card__tag-row">
        <span style={{ fontSize: 16 }}>{uc.icon}</span>
        <span
          className="usecase-card__tag"
          style={{ color, background: ghost, borderColor: border }}
        >
          {uc.tag}
        </span>
      </div>
      <h3 className="usecase-card__title">{uc.title}</h3>
      <p className="usecase-card__body">{uc.body}</p>
    </div>
  );
}

export default function UseCases() {
  const headerRef = useReveal<HTMLDivElement>(0.15);

  return (
    <section id="use-cases" className="usecases-section" aria-labelledby="usecases-heading">

      <div className="section-inner">

        {/* ── Split header ── */}
        <div ref={headerRef} className="usecases-header">
          <div className="usecases-header__left">
            <div className="tag">Built for Charleston</div>
            <h2 id="usecases-heading" className="section-heading"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, textAlign: 'left' }}>
              One Tool, Every
              <br />
              <span style={{ color: 'var(--cyan)' }}>Charleston Workflow.</span>
            </h2>
          </div>
          <div className="usecases-header__right">
            <p style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontSize: 'clamp(15px, 1.8vw, 17px)',
              color: 'var(--text-mid)',
              lineHeight: 1.75,
              margin: 0,
            }}>
              Designed for listing agents, short-term rental hosts, brokerages,
              and luxury specialists working the tri-county metro.
            </p>
            <Link to="/login" className="btn btn-ghost" style={{ marginTop: 24, alignSelf: 'flex-start' }}>
              Start free — no credit card →
            </Link>
          </div>
        </div>

        {/* ── Use-case grid ── */}
        <div className="usecases-grid">
          {USE_CASES.map((uc, i) => (
            <UseCase key={uc.title} uc={uc} index={i} />
          ))}
        </div>

        {/* ── Capability stat bar ── */}
        <div className="usecases-stats">
          {CAPABILITIES.map(({ value, label }, i) => (
            <div key={label} className="usecases-stat"
              style={{ borderRight: i < CAPABILITIES.length - 1 ? '1px solid var(--cyan-border)' : 'none' }}>
              <div className="usecases-stat__value">{value}</div>
              <div className="usecases-stat__label">{label}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
