// ─────────────────────────────────────────────────────────────────────────────
//  Features.tsx
//
//  Bento grid: 3-column rhythm — row 1: pillar (×2) + landmark; rows 2–3: three
//  cards each (8 cards total). Each card is built to scan in two seconds:
//  category → title → one-sentence summary → 2–3 proof chips.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';

function useReveal<T extends HTMLElement>(threshold = 0.1) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.setAttribute('data-revealed', '');
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

type Accent = 'cyan' | 'magenta';

type IconKey =
  | 'neighborhood'
  | 'landmark'
  | 'photo'
  | 'staging'
  | 'scoring'
  | 'csv'
  | 'team'
  | 'multi';

const Icons: Record<IconKey, (c: string) => ReactElement> = {
  neighborhood: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M3 9h6M3 15h6" /><path d="M15 9h4M15 15h4" />
    </svg>
  ),
  landmark: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
    </svg>
  ),
  photo: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
    </svg>
  ),
  staging: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20v-4H2v4zM2 12h20V8H2v4z" /><path d="M6 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
    </svg>
  ),
  scoring: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  csv: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" /><polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  ),
  team: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  multi: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z" /><path d="M4 9h16M4 14h16M9 4v16M14 4v16" />
    </svg>
  ),
};

type FeatureCard = {
  icon: IconKey;
  category: string;
  accent: Accent;
  title: string;
  summary: string;
  proofs: string[];
  variant?: 'pillar' | 'standard';
  /** Optional headline metric — only rendered on `pillar` variant */
  headlineMetric?: { value: string; label: string };
};

/** Metro coverage strip (geography); Distance Matrix landmarks remain the 8 in config.ts. */
export const TRI_COUNTY_COVERAGE_AREAS = [
  'Mount Pleasant',
  'Isle of Palms',
  "Sullivan's Island",
  'Downtown',
  'North Charleston',
  'West Ashley',
  'James Island',
  'Johns Island',
  'Summerville',
] as const;

const FEATURES: FeatureCard[] = [
  {
    icon: 'neighborhood',
    category: 'Hyper-local AI',
    accent: 'cyan',
    variant: 'pillar',
    title: 'Speaks Charleston, not Realtor.',
    summary:
      'Detects the neighborhood from any address and writes copy with local vocabulary — not a national template.',
    proofs: ['13 neighborhood profiles', 'Piazza, not porch', 'Tidal creek context'],
    headlineMetric: { value: '13', label: 'neighborhoods' },
  },
  {
    icon: 'landmark',
    category: 'Verified data',
    accent: 'cyan',
    title: 'Real driving distances, not guesses.',
    summary:
      'Google Maps Distance Matrix calculates exact times to the eight Charleston landmarks buyers actually search for.',
    proofs: ['King St + Shem Creek', "Folly, IOP, Sullivan's", 'Ravenel, Angel Oak, Magnolia'],
  },
  {
    icon: 'photo',
    category: 'Vision AI',
    accent: 'magenta',
    title: 'Your photos write the listing.',
    summary:
      'Upload up to ten photos. Vision identifies architectural details and weaves them into the draft automatically.',
    proofs: ['10 photos max', 'Shiplap, coffered, piazza', 'OpenAI Vision'],
  },
  {
    icon: 'staging',
    category: 'Virtual staging',
    accent: 'magenta',
    title: 'Empty rooms, furnished in 30 seconds.',
    summary:
      'Six styles tuned for Charleston interiors, with real-time progress and a before/after comparison built in.',
    proofs: ['Coastal modern', 'Lowcountry traditional', 'Powered by fal.ai'],
  },
  {
    icon: 'scoring',
    category: 'Scoring',
    accent: 'cyan',
    title: 'Know how local your copy sounds.',
    summary:
      'Every draft gets a Lowcountry Authenticity score, a Confidence score, and two specific improvement suggestions.',
    proofs: ['0 – 100 scale', '2 actionable fixes', 'Penalises clichés'],
  },
  {
    icon: 'csv',
    category: 'Bulk tools',
    accent: 'cyan',
    title: 'Scale to a whole portfolio.',
    summary:
      'Upload a spreadsheet of addresses and generate listings in one pass — built for property managers and brokerages.',
    proofs: ['CSV in', 'Bulk export', 'Brokerage-ready'],
  },
  {
    icon: 'team',
    category: 'Teams',
    accent: 'magenta',
    title: 'Your whole team, one subscription.',
    summary:
      'Shared quotas, Owner / Editor / Viewer roles, and custom brokerage branding — built for 3–15+ agent teams.',
    proofs: ['Shared quota', 'Role-based access', 'Custom branding'],
  },
  {
    icon: 'multi',
    category: 'Multi-format',
    accent: 'magenta',
    title: 'One address, three publish-ready drafts.',
    summary:
      'MLS, Airbnb, and social copy generated together — each tuned to its own audience, length, and tone.',
    proofs: ['RESO-compliant MLS', 'Airbnb guest copy', 'Social + hashtags'],
  },
];

function FeatCard({ card, index }: { card: FeatureCard; index: number }) {
  const ref = useReveal<HTMLDivElement>(0.08);
  const isPillar = card.variant === 'pillar';

  return (
    <div
      ref={ref}
      className="feat-card"
      data-accent={card.accent}
      data-variant={isPillar ? 'pillar' : 'standard'}
      style={{ '--reveal-delay': `${index * 60}ms` } as CSSProperties}
      role="article"
      aria-label={card.title}
    >
      <div className="feat-card__inner">
        <div className="feat-card__head">
          <span className="feat-card__category">
            <span className="feat-card__icon" aria-hidden="true">
              {Icons[card.icon]('currentColor')}
            </span>
            {card.category}
          </span>
          {isPillar && card.headlineMetric && (
            <span className="feat-card__headline-metric" aria-label={`${card.headlineMetric.value} ${card.headlineMetric.label}`}>
              <span className="feat-card__headline-metric-value">{card.headlineMetric.value}</span>
              <span className="feat-card__headline-metric-label">{card.headlineMetric.label}</span>
            </span>
          )}
        </div>

        <h3 className="feat-card__title">{card.title}</h3>
        <p className="feat-card__summary">{card.summary}</p>

        <ul className="feat-card__proofs" aria-label="Specifics">
          {card.proofs.map((p) => (
            <li key={p} className="feat-card__proof">
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Features() {
  const hdrRef = useReveal<HTMLDivElement>(0.15);

  const [pillar, landmark, photo, staging, scoring, csv, team, multiFormat] = FEATURES;

  const ordered: FeatureCard[] = [pillar, landmark, photo, staging, scoring, csv, team, multiFormat];
  const idx = (c: FeatureCard) => ordered.findIndex((x) => x.title === c.title);

  return (
    <section id="features" className="features-section" aria-labelledby="features-heading">
      <div className="features-section__bg" aria-hidden="true" />

      <div className="section-inner">
        <div ref={hdrRef} className="features-header section-header" data-align="center">
          <div className="tag">Everything Charleston Agents Need</div>
          <h2 id="features-heading" className="section-heading">
            Nothing <span style={{ color: 'var(--cyan)' }}>Generic.</span>
          </h2>
          <p className="section-sub">
            Built ground-up for Charleston, Berkeley, and Dorchester county. Every feature
            calibrated for Lowcountry real estate — not a national template.
          </p>
        </div>

        <div className="features-landmarks" role="list" aria-label="Tri-county metro coverage">
          <span className="features-landmarks__label" aria-hidden="true">Metro coverage</span>
          {TRI_COUNTY_COVERAGE_AREAS.map((area) => (
            <span key={area} className="features-landmarks__chip" role="listitem">
              {area}
            </span>
          ))}
        </div>

        <div className="features-bento" role="list" aria-label="Feature list">
          <div className="features-bento__cell features-bento__cell--span2">
            <FeatCard card={pillar} index={idx(pillar)} />
          </div>
          <div className="features-bento__cell">
            <FeatCard card={landmark} index={idx(landmark)} />
          </div>
          {[photo, staging, scoring, csv, team, multiFormat].map((c) => (
            <div key={c.title} className="features-bento__cell">
              <FeatCard card={c} index={idx(c)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
