// ─────────────────────────────────────────────────────────────────────────────
//  Features.tsx  ·  Full replacement
//
//  Bento grid layout: 5 feature cards across 3 rows.
//  Row 1: Hyper-local (wide) spanning 2 cols, Verified Distances (narrow)
//  Row 2: Photo Vision (narrow), Virtual Staging (narrow), Scoring (narrow) → 3 cols
//  Row 3: CSV Bulk (narrow), Team Dashboard (narrow) → 2 cols
//
//  Every card has:
//    - icon box  |  tag pill  (DM Mono)
//    - Playfair headline
//    - benefit line  (DM Mono uppercase)
//    - DM Sans body copy
//    - accent variant ('cyan' | 'magenta')
//    - optional stat badge (top-right corner)
//    - scroll-reveal via IntersectionObserver
//
//  No fake testimonials. No fabricated quotes.
//  All copy matches what ships on the current landing page.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';

/* ── Shared reveal hook ─────────────────────────────────────────────────── */
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

/* ── Token aliases (resolve from CSS vars in neon-theme.css) ────────────── */
type Accent = 'cyan' | 'magenta';
const PALETTE: Record<Accent, { color: string; ghost: string; border: string; gradient: string }> = {
  cyan: {
    color:    'var(--cyan)',
    ghost:    'var(--cyan-ghost)',
    border:   'var(--cyan-border)',
    gradient: 'linear-gradient(135deg, oklch(0.72 0.13 195 / 0.75), oklch(0.65 0.16 210 / 0.75))',
  },
  magenta: {
    color:    'var(--magenta)',
    ghost:    'var(--magenta-ghost)',
    border:   'var(--magenta-border)',
    gradient: 'linear-gradient(135deg, oklch(0.82 0.20 345 / 0.75), oklch(0.72 0.22 340 / 0.75))',
  },
};

/* ── Icon components (inline SVG — no external deps) ────────────────────── */
const Icons: Record<string, (c: string) => ReactElement> = {
  neighborhood: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h6M3 15h6"/><path d="M15 9h4M15 15h4"/>
    </svg>
  ),
  landmark: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/>
    </svg>
  ),
  photo: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
    </svg>
  ),
  staging: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20v-4H2v4zM2 12h20V8H2v4z"/><path d="M6 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/>
    </svg>
  ),
  scoring: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  csv: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  ),
  team: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  multi: (c) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z"/><path d="M4 9h16M4 14h16M9 4v16M14 4v16"/>
    </svg>
  ),
};

/* ── Feature card data ───────────────────────────────────────────────────── */
type FeatureCard = {
  icon: string;
  tag: string;
  accent: Accent;
  title: string;
  benefit: string;
  desc: string;
  badge?: { num: string; lbl: string };
  stat?: { num: string; lbl: string };   // for wide cards only
  wide?: boolean;
};

const FEATURES: FeatureCard[] = [
  {
    icon: 'neighborhood',
    tag: 'Hyper-Local',
    accent: 'cyan',
    title: 'Neighborhood Intelligence',
    benefit: 'Sound like a local, every time',
    desc:
      'Auto-detects neighborhood from any address and injects authentic vocabulary — "piazza" not "porch", tidal creek views, live oak canopy. Covers 13 Charleston-area neighborhoods, each with curated selling points and lifestyle context.',
    stat: { num: '13', lbl: 'neighborhoods' },
    wide: true,
  },
  {
    icon: 'landmark',
    tag: 'Verified Data',
    accent: 'cyan',
    title: '8 Verified Landmark Distances',
    benefit: 'Real driving distances, not guesses',
    desc:
      'Google Maps Distance Matrix calculates exact driving distances to King Street, Shem Creek, Sullivan\'s Island, Isle of Palms, Folly Beach, Ravenel Bridge, Angel Oak, and Magnolia Plantation — automatically woven into every listing.',
    badge: { num: '8', lbl: 'landmarks' },
  },
  {
    icon: 'photo',
    tag: 'Vision AI',
    accent: 'magenta',
    title: 'Photo Feature Extraction',
    benefit: 'Your photos write the listing',
    desc:
      'Upload up to 10 photos. OpenAI Vision identifies shiplap walls, coffered ceilings, chef\'s kitchens, piazza details, and Lowcountry architectural finishes — then weaves them into your copy automatically.',
    badge: { num: '10', lbl: 'photos max' },
  },
  {
    icon: 'staging',
    tag: 'Virtual Staging',
    accent: 'magenta',
    title: '6 AI Staging Styles',
    benefit: 'Transform empty rooms in 30 seconds',
    desc:
      'Choose from Coastal Modern, Lowcountry Traditional, Contemporary, Minimalist, Luxury Resort, or Empty & Clean. Powered by fal.ai with real-time progress tracking and before/after comparison built in.',
    badge: { num: '6', lbl: 'styles' },
  },
  {
    icon: 'scoring',
    tag: 'Scoring',
    accent: 'cyan',
    title: 'Authenticity Scoring',
    benefit: 'Know exactly how local your copy sounds',
    desc:
      'Every listing gets a Lowcountry Authenticity Score, a Confidence Score, and 2 specific improvement suggestions. Scores reward piazza usage, landmark references, and neighborhood vocabulary — and penalize generic clichés.',
    badge: { num: '94%', lbl: 'top score' },
  },
  {
    icon: 'csv',
    tag: 'Bulk Tools',
    accent: 'cyan',
    title: 'CSV Bulk Generation',
    benefit: 'Scale to your whole portfolio',
    desc:
      'Upload a spreadsheet of addresses and generate listings at scale — perfect for property managers and brokerages handling multiple Charleston-area properties at once.',
  },
  {
    icon: 'team',
    tag: 'Team',
    accent: 'magenta',
    title: 'Multi-User Team Dashboard',
    benefit: 'Your whole team, one subscription',
    desc:
      'Shared quotas, Owner/Editor/Viewer roles, and custom brokerage branding (logo + colors). Built for 3–15+ agent teams with full audit trails and a shared staging credit pool.',
  },
  {
    icon: 'multi',
    tag: 'Multi-Format',
    accent: 'magenta',
    title: 'MLS + Airbnb + Social',
    benefit: 'One input, three ready-to-publish outputs',
    desc:
      'One address generates a 350–450 word RESO-compliant MLS description, 200–250 word Airbnb guest copy, and 3 social captions with hyper-local hashtags — all calibrated for their respective audiences.',
  },
];

const LANDMARKS = ['King Street', 'Shem Creek', 'Sullivan\'s Island', 'Isle of Palms', 'Folly Beach', 'Ravenel Bridge', 'Angel Oak', 'Magnolia Plantation'];

/* ── Feature card component ─────────────────────────────────────────────── */
function FeatCard({ card, index }: { card: FeatureCard; index: number }) {
  const ref = useReveal<HTMLDivElement>(0.08);
  const p = PALETTE[card.accent];
  const isWide = !!card.wide;

  return (
    <div
      ref={ref}
      className="feat-card"
      data-accent={card.accent}
      style={{ '--reveal-delay': `${index * 65}ms` } as CSSProperties}
      role="article"
      aria-label={card.title}
    >
      {/* top gradient line */}
      <div className="feat-card__topline" style={{ background: p.gradient }} />
      {/* left accent bar on hover */}
      <div className="feat-card__leftbar" style={{ background: p.gradient }} />

      {/* optional badge — narrow cards */}
      {card.badge && !isWide && (
        <div className="feat-card__badge"
          style={{ background: p.ghost, borderColor: p.border }}
          aria-label={`${card.badge.num} ${card.badge.lbl}`}
        >
          <span className="feat-card__badge-num" style={{ color: p.color }}>{card.badge.num}</span>
          <span className="feat-card__badge-lbl">{card.badge.lbl}</span>
        </div>
      )}

      <div className={`feat-card__inner${isWide ? ' feat-card__inner--wide' : ''}`}>
        {/* main content column */}
        <div className="feat-card__content">
          <div className="feat-card__meta">
            <div className="feat-card__iconbox" style={{ color: p.color }}>
              {Icons[card.icon]?.(p.color)}
            </div>
            <span className="feat-card__tag"
              style={{ color: p.color, background: p.ghost, borderColor: p.border }}>
              {card.tag}
            </span>
          </div>
          <h3 className="feat-card__title">{card.title}</h3>
          <p className="feat-card__benefit" style={{ color: p.color }}>{card.benefit}</p>
          <p className="feat-card__desc">{card.desc}</p>
        </div>

        {/* stat block — wide cards only */}
        {isWide && card.stat && (
          <div className="feat-card__statblock" aria-label={`${card.stat.num} ${card.stat.lbl}`}>
            <div className="feat-card__stat-num" style={{ color: p.color }}>{card.stat.num}</div>
            <div className="feat-card__stat-lbl">{card.stat.lbl}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Features section ───────────────────────────────────────────────────── */
export default function Features() {
  const hdrRef  = useReveal<HTMLDivElement>(0.15);

  const wideCard   = FEATURES.filter(c => c.wide);
  const narrowRow1 = FEATURES.filter(c => !c.wide).slice(0, 3);   // landmark, photo, staging
  const narrowRow2 = FEATURES.filter(c => !c.wide).slice(3, 5);   // scoring, csv
  const narrowRow3 = FEATURES.filter(c => !c.wide).slice(5);      // team, multi

  // flat index for reveal stagger
  const all = [...wideCard, ...narrowRow1, ...narrowRow2, ...narrowRow3];
  const idx = (c: FeatureCard) => all.findIndex(x => x.title === c.title);

  return (
    <section id="features" className="features-section" aria-labelledby="features-heading">
      {/* ambient background */}
      <div className="features-section__bg" aria-hidden="true" />

      <div className="section-inner">

        {/* ── Section header ── */}
        <div ref={hdrRef} className="features-header section-header" data-align="center">
          <div className="tag">Everything Charleston Agents Need</div>
          <h2 id="features-heading" className="section-heading">
            Nothing <span style={{ color: 'var(--cyan)' }}>Generic.</span>
          </h2>
          <p className="section-sub">
            Built ground-up for Charleston, Berkeley, and Dorchester county.
            Every feature calibrated for Lowcountry real estate — not a national template.
          </p>
        </div>

        {/* ── Landmark strip ── */}
        <div className="features-landmarks" role="list" aria-label="Covered landmarks">
          <span className="features-landmarks__label" aria-hidden="true">Landmark Coverage</span>
          {LANDMARKS.map(lm => (
            <span key={lm} className="features-landmarks__chip" role="listitem">{lm}</span>
          ))}
        </div>

        {/* ── Bento grid ── */}
        <div className="features-bento" role="list" aria-label="Feature list">

          {/* Row 1: wide card + narrow card side by side */}
          <div className="features-bento__cell features-bento__cell--wide" style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 16 }}>
            {wideCard.map(c => <FeatCard key={c.title} card={c} index={idx(c)} />)}
            <FeatCard card={narrowRow1[0]} index={idx(narrowRow1[0])} />
          </div>

          {/* Row 2: 3 narrow cards */}
          {narrowRow1.slice(1).concat(narrowRow2.slice(0, 1)).map(c => (
            <div key={c.title} className="features-bento__cell">
              <FeatCard card={c} index={idx(c)} />
            </div>
          ))}
          <div className="features-bento__cell">
            <FeatCard card={narrowRow2[1]} index={idx(narrowRow2[1])} />
          </div>

          {/* Row 3: 2 narrow cards, then a full-width cell for multi-format */}
          {narrowRow3.slice(0, 1).map(c => (
            <div key={c.title} className="features-bento__cell">
              <FeatCard card={c} index={idx(c)} />
            </div>
          ))}
          <div className="features-bento__cell">
            <FeatCard card={narrowRow3[1]} index={idx(narrowRow3[1])} />
          </div>

        </div>
      </div>
    </section>
  );
}
