import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function FeaturesCta() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (user) {
    return (
      <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ fontSize: 15, padding: '15px 36px' }}>
        Go to Dashboard →
      </button>
    );
  }
  return (
    <a href="/login" className="btn btn-primary" style={{ fontSize: 15, padding: '15px 36px' }}>
      Try It Free — No Credit Card →
    </a>
  );
}

const GLYPHS: Record<string, ReactNode> = {
  map: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="4.5" width="7" height="7" rx="1.5" />
      <rect x="13" y="4.5" width="7" height="7" rx="1.5" />
      <rect x="4" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z" />
      <circle cx="12" cy="11" r="2.25" />
    </svg>
  ),
  vision: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  frame: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 5.5h16v13H4zM7 8.5h10v7H7z" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3zM3 12l9 4.5L21 12M3 16.5 12 21l9-4.5" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 19V5M5 19h14M9 15l3-4 3 2 4-6" />
    </svg>
  ),
  bulk: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M6 6.5h12M6 11.5h12M6 16.5h12M6 6.5v10M18 6.5v10" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M8 8.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 8.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
      <path d="M4 19.5v-.5a3.5 3.5 0 0 1 3.5-3.5h1M20 19.5v-.5a3.5 3.5 0 0 0-3.5-3.5h-1" />
      <path d="M12 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM12 20v-6M9 14h6" />
    </svg>
  ),
};

function FeatureGlyph({ name }: { name: keyof typeof GLYPHS }) {
  return <span className="features-icon-mark">{GLYPHS[name]}</span>;
}

const FEATURES = [
  {
    glyph: 'map' as const,
    tag: 'HYPER-LOCAL',
    tagMagenta: false,
    title: 'Neighborhood Intelligence',
    benefit: 'Sound like a local, every time',
    desc: 'Auto-detects neighborhood from any address and injects authentic vocabulary — "piazza" not "porch", tidal creek views, live oak canopy. Covers 13 Charleston-area neighborhoods, each with curated selling points and lifestyle context.',
  },
  {
    glyph: 'pin' as const,
    tag: 'VERIFIED DATA',
    tagMagenta: true,
    title: '8 Verified Landmark Distances',
    benefit: 'Real driving distances, not guesses',
    desc: 'Google Maps Distance Matrix calculates exact driving distances to Downtown Charleston, Shem Creek, Sullivan\'s Island, Isle of Palms, Folly Beach, Ravenel Bridge, Angel Oak, and Magnolia Plantation — automatically woven into every listing.',
  },
  {
    glyph: 'vision' as const,
    tag: 'VISION AI',
    tagMagenta: false,
    title: 'Photo Feature Extraction',
    benefit: 'Your photos write the listing',
    desc: 'Upload up to 10 photos. OpenAI Vision identifies shiplap walls, coffered ceilings, chef\'s kitchens, piazza details, and Lowcountry architectural finishes — then weaves them into your copy automatically.',
  },
  {
    glyph: 'frame' as const,
    tag: 'VIRTUAL STAGING',
    tagMagenta: true,
    title: '6 AI Staging Styles',
    benefit: 'Transform empty rooms in 30 seconds',
    desc: 'Choose from Coastal Modern, Lowcountry Traditional, Contemporary, Minimalist, Luxury Resort, or Empty & Clean. Powered by fal.ai with real-time progress tracking and a before/after comparison built in.',
  },
  {
    glyph: 'layers' as const,
    tag: 'MULTI-FORMAT',
    tagMagenta: false,
    title: 'MLS + Airbnb + Social',
    benefit: 'One input, three ready-to-publish outputs',
    desc: 'One address generates a 350–450 word RESO-compliant MLS description, 200–250 word Airbnb guest copy, and 3 social captions with hyper-local hashtags — all calibrated for their respective audiences.',
  },
  {
    glyph: 'chart' as const,
    tag: 'SCORING',
    tagMagenta: true,
    title: 'Authenticity Scoring',
    benefit: 'Know exactly how local your copy sounds',
    desc: 'Every listing gets a Lowcountry Authenticity Score, a Confidence Score, and 2 specific improvement suggestions. Scores reward piazza usage, landmark references, and neighborhood vocabulary — and penalize generic clichés.',
  },
  {
    glyph: 'bulk' as const,
    tag: 'BULK TOOLS',
    tagMagenta: false,
    title: 'CSV Bulk Generation',
    benefit: 'Scale to your whole portfolio',
    desc: 'Upload a spreadsheet of addresses and generate listings at scale — perfect for property managers and brokerages handling multiple Charleston-area properties at once.',
  },
  {
    glyph: 'team' as const,
    tag: 'TEAM',
    tagMagenta: true,
    title: 'Multi-User Team Dashboard',
    benefit: 'Your whole team, one subscription',
    desc: 'Shared quotas, Owner/Editor/Viewer roles, and custom brokerage branding (logo + colors). Built for 3–15+ agent teams with full audit trails and a shared staging credit pool.',
  },
];

const LANDMARKS = [
  'King Street', 'Shem Creek', "Sullivan's Island", 'Isle of Palms',
  'Folly Beach', 'Ravenel Bridge', 'Angel Oak', 'Magnolia Plantation',
];

export default function Features() {
  return (
    <section
      id="features"
      style={{
        position: 'relative',
        padding: '100px 0 110px',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 90% 55% at 50% -15%, oklch(0.72 0.13 195 / 0.1) 0%, transparent 52%),' +
          'radial-gradient(ellipse 48% 42% at 100% 85%, oklch(0.78 0.11 85 / 0.06) 0%, transparent 50%),' +
          'var(--space)',
      }}
    >
      {/* Subtle grain + grid — same language as dashboard shell / hero depth */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.5,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.035\'/%3E%3C/svg%3E")',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.22,
          backgroundImage:
            'linear-gradient(oklch(0.72 0.13 195 / 0.06) 1px, transparent 1px),' +
            'linear-gradient(90deg, oklch(0.72 0.13 195 / 0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, black 15%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, black 15%, transparent 72%)',
        }}
      />

      <div className="section-inner" style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <header className="section-header" style={{ marginBottom: 52 }}>
          <div className="tag">Features</div>
          <h2
            className="section-heading"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 800,
              marginTop: 12,
              marginBottom: 14,
            }}
          >
            <span style={{ color: 'var(--text-hi)' }}>Everything Charleston Agents Need.</span>
            <br />
            <span style={{ color: 'var(--text-hi)' }}>Nothing </span>
            <span className="shimmer-text">Generic.</span>
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 22px' }}>
            <div
              style={{
                width: 140,
                height: 1,
                background: 'linear-gradient(90deg, transparent, var(--cyan-dim), var(--magenta-dim), transparent)',
              }}
            />
          </div>
          <p
            className="section-sub"
            style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontWeight: 400,
              maxWidth: 580,
            }}
          >
            Built ground-up for Charleston, Berkeley, and Dorchester county.
            Every feature calibrated for Lowcountry real estate — not a national template.
          </p>
        </header>

        {/* Landmark strip */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginBottom: 48,
            padding: '14px 18px',
            background: 'var(--cyan-ghost)',
            border: '1px solid var(--cyan-border)',
            borderRadius: 16,
            maxWidth: '100%',
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', ui-monospace, monospace",
              fontSize: 9,
              color: 'var(--cyan)',
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              paddingRight: 14,
              marginRight: 2,
              borderRight: '1px solid var(--cyan-border)',
            }}
          >
            Landmark coverage
          </span>
          {LANDMARKS.map((lm) => (
            <span
              key={lm}
              style={{
                fontFamily: "'DM Mono', ui-monospace, monospace",
                fontSize: 10,
                letterSpacing: '.04em',
                color: 'var(--text-mid)',
                padding: '4px 10px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              {lm}
            </span>
          ))}
        </div>

        {/* Feature grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: 18,
            width: '100%',
          }}
        >
          {FEATURES.map((f) => (
            <article key={f.title} className="features-grid-card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <FeatureGlyph name={f.glyph} />
                <span
                  className={f.tagMagenta ? 'tag tag-magenta' : 'tag'}
                  style={{ margin: 0, fontSize: 8.5, flexShrink: 0 }}
                >
                  {f.tag}
                </span>
              </div>

              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700,
                  fontSize: 18,
                  lineHeight: 1.22,
                  color: 'var(--text-hi)',
                  margin: '0 0 8px',
                }}
              >
                {f.title}
              </h3>

              <p
                style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace",
                  fontSize: 9.5,
                  color: f.tagMagenta ? 'var(--magenta)' : 'var(--cyan)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  margin: '0 0 12px',
                }}
              >
                {f.benefit}
              </p>

              <p
                style={{
                  fontFamily: 'DM Sans, system-ui, sans-serif',
                  fontSize: 13.5,
                  lineHeight: 1.72,
                  color: 'var(--text-mid)',
                  margin: 0,
                  flex: 1,
                }}
              >
                {f.desc}
              </p>
            </article>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: 56 }}>
          <p
            style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              color: 'var(--text-mid)',
              fontSize: 15,
              marginBottom: 22,
              lineHeight: 1.65,
            }}
          >
            Ready to close faster in a cooling market?
          </p>
          <FeaturesCta />
        </div>
      </div>
    </section>
  );
}
