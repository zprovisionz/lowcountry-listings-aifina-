// ─────────────────────────────────────────────────────────────────────────────
//  UseCases.tsx — replaces Testimonials.tsx
//  Honest “Built for Charleston” section. No fabricated testimonials.
//  As real quotes come in, drop them into TESTIMONIALS array.
//  Layout: editorial 2-col header, symmetric 2×2 grid (equal card rhythm),
//          full-width capability bar.
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
      if (e.isIntersecting) {
        el.setAttribute('data-revealed', '');
        obs.disconnect();
      }
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
  tag: string;
  accent: Accent;
  title: string;
  body: string;
}[] = [
  {
    tag: 'Listing Agents',
    accent: 'cyan',
    title: 'Fast MLS-ready drafts',
    body:
      'Address in, neighborhood inferred, landmark driving distances stitched in — you edit and publish instead of wrestling a blank MLS field.',
  },
  {
    tag: 'STR Hosts',
    accent: 'cyan',
    title: 'Airbnb copy that reads local',
    body:
      'Guest-facing format tuned for what people search near the coast: arrivals, waterfront access, neighborhoods — without generic filler.',
  },
  {
    tag: 'Brokerages',
    accent: 'magenta',
    title: 'Teams share one quota',
    body:
      'Roles, pooled generations, Stripe billing, optional branding — align a handful of producers without juggling separate logins.',
  },
  {
    tag: 'Luxury Specialists',
    accent: 'magenta',
    title: 'Score, then regenerate',
    body:
      'Authenticity and confidence cues on each draft plus targeted regenerate so tone stays upscale while specifics stay factual.',
  },
];

const CAPABILITIES = [
  { value: '9', label: 'Metro coverage zones' },
  { value: '13', label: 'Neighborhood profiles' },
  { value: '6', label: 'Staging styles' },
  { value: '< 60s', label: 'Typical generation time' },
];

function UseCaseCard({ uc, index }: { uc: (typeof USE_CASES)[0]; index: number }) {
  const ref = useReveal<HTMLDivElement>(0.1);
  const isCyan = uc.accent === 'cyan';
  const color = isCyan ? 'var(--cyan)' : 'var(--magenta)';
  const ghost = isCyan ? 'var(--cyan-ghost)' : 'var(--magenta-ghost)';
  const border = isCyan ? 'var(--cyan-border)' : 'var(--magenta-border)';
  const idx = String(index + 1).padStart(2, '0');

  return (
    <div
      ref={ref}
      className="usecase-card"
      style={{ '--reveal-delay': `${index * 70}ms` } as CSSProperties}
      data-accent={uc.accent}
    >
      <div className="usecase-card__meta">
        <span className="usecase-card__index">{idx}</span>
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
        <div ref={headerRef} className="usecases-header">
          <div className="usecases-header__left">
            <div className="tag">Built for Charleston</div>
            <h2
              id="usecases-heading"
              className="section-heading"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 800,
                textAlign: 'left',
              }}
            >
              One Tool, Every
              <br />
              <span style={{ color: 'var(--cyan)' }}>Charleston Workflow.</span>
            </h2>
          </div>
          <div className="usecases-header__right">
            <p className="section-sub usecases-header__lede">
              Listing agents, short-term hosts, brokerages, and tri-county specialists — same engine,
              calibrated for Charleston, Berkeley, and Dorchester.
            </p>
            <Link to="/login" className="btn btn-ghost usecases-header__cta">
              Start free — no credit card →
            </Link>
          </div>
        </div>

        <div className="usecases-grid" role="list" aria-label="Primary workflows">
          {USE_CASES.map((uc, i) => (
            <UseCaseCard key={uc.title} uc={uc} index={i} />
          ))}
        </div>

        <div className="usecases-stats" role="group" aria-label="Product highlights">
          {CAPABILITIES.map(({ value, label }, i) => (
            <div
              key={label}
              className="usecases-stat"
              style={{
                borderRight: i < CAPABILITIES.length - 1 ? '1px solid var(--cyan-border)' : 'none',
              }}
            >
              <div className="usecases-stat__value">{value}</div>
              <div className="usecases-stat__label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
