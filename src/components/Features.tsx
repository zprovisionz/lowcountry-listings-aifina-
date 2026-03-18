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

const FEATURES = [
  {
    icon: '🗺️', tag: 'HYPER-LOCAL', color: 'cyan' as const,
    title: 'Neighborhood Intelligence',
    benefit: 'Sound like a local, every time',
    desc: 'Auto-detects neighborhood from any address and injects authentic vocabulary — "piazza" not "porch", tidal creek views, live oak canopy. Covers 13 Charleston-area neighborhoods, each with curated selling points and lifestyle context.',
  },
  {
    icon: '📍', tag: 'VERIFIED DATA', color: 'magenta' as const,
    title: '8 Verified Landmark Distances',
    benefit: 'Real driving distances, not guesses',
    desc: 'Google Maps Distance Matrix calculates exact driving distances to Downtown Charleston, Shem Creek, Sullivan\'s Island, Isle of Palms, Folly Beach, Ravenel Bridge, Angel Oak, and Magnolia Plantation — automatically woven into every listing.',
  },
  {
    icon: '📸', tag: 'VISION AI', color: 'cyan' as const,
    title: 'Photo Feature Extraction',
    benefit: 'Your photos write the listing',
    desc: 'Upload up to 10 photos. OpenAI Vision identifies shiplap walls, coffered ceilings, chef\'s kitchens, piazza details, and Lowcountry architectural finishes — then weaves them into your copy automatically.',
  },
  {
    icon: '🏠', tag: 'VIRTUAL STAGING', color: 'magenta' as const,
    title: '6 AI Staging Styles',
    benefit: 'Transform empty rooms in 30 seconds',
    desc: 'Choose from Coastal Modern, Lowcountry Traditional, Contemporary, Minimalist, Luxury Resort, or Empty & Clean. Powered by fal.ai with real-time progress tracking and a before/after comparison built in.',
  },
  {
    icon: '✍️', tag: 'MULTI-FORMAT', color: 'cyan' as const,
    title: 'MLS + Airbnb + Social',
    benefit: 'One input, three ready-to-publish outputs',
    desc: 'One address generates a 350–450 word RESO-compliant MLS description, 200–250 word Airbnb guest copy, and 3 social captions with hyper-local hashtags — all calibrated for their respective audiences.',
  },
  {
    icon: '📊', tag: 'SCORING', color: 'magenta' as const,
    title: 'Authenticity Scoring',
    benefit: 'Know exactly how local your copy sounds',
    desc: 'Every listing gets a Lowcountry Authenticity Score, a Confidence Score, and 2 specific improvement suggestions. Scores reward piazza usage, landmark references, and neighborhood vocabulary — and penalize generic clichés.',
  },
  {
    icon: '⚡', tag: 'BULK TOOLS', color: 'cyan' as const,
    title: 'CSV Bulk Generation',
    benefit: 'Scale to your whole portfolio',
    desc: 'Upload a spreadsheet of addresses and generate listings at scale — perfect for property managers and brokerages handling multiple Charleston-area properties at once.',
  },
  {
    icon: '👥', tag: 'TEAM', color: 'magenta' as const,
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
    <section id="features" style={{
      padding: '110px 0',
      background:
        'radial-gradient(ellipse 65% 50% at 90% 50%, rgba(0,255,255,0.025) 0%, transparent 70%),' +
        'radial-gradient(ellipse 50% 45% at 10% 80%, rgba(255,0,255,0.022) 0%, transparent 70%),' +
        '#0a0a1f',
    }}>
      <div className="section-inner">

        {/* Header */}
        <div className="section-header">
          <div className="tag">Features</div>
          <h2 className="section-heading">
            Everything Charleston Agents Need.
            <br />
            <span style={{ color: 'var(--cyan)' }}>Nothing Generic.</span>
          </h2>
          <p className="section-sub">
            Built ground-up for Charleston, Berkeley, and Dorchester county.
            Every feature calibrated for Lowcountry real estate — not a national template.
          </p>
        </div>

        {/* Landmark strip */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          gap: 8, marginBottom: 64,
          padding: '14px 20px',
          background: 'rgba(0,255,255,0.025)',
          border: '1px solid rgba(0,255,255,0.1)',
          borderRadius: 12,
        }}>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: 9,
            color: 'var(--text-lo)', letterSpacing: '.16em',
            paddingRight: 12, borderRight: '1px solid rgba(0,255,255,0.12)',
            marginRight: 4, whiteSpace: 'nowrap',
          }}>
            LANDMARK COVERAGE
          </span>
          {LANDMARKS.map((lm, i) => (
            <span key={lm} style={{
              fontFamily: 'Space Mono, monospace', fontSize: 10,
              color: i % 2 === 0 ? 'rgba(0,255,255,0.65)' : 'rgba(255,0,255,0.6)',
              padding: '3px 9px',
              background: i % 2 === 0 ? 'rgba(0,255,255,0.05)' : 'rgba(255,0,255,0.04)',
              borderRadius: 5,
              border: `1px solid ${i % 2 === 0 ? 'rgba(0,255,255,0.12)' : 'rgba(255,0,255,0.1)'}`,
            }}>
              {lm}
            </span>
          ))}
        </div>

        {/* Feature grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {FEATURES.map((f) => {
            const isCyan = f.color === 'cyan';
            return (
              <div
                key={f.title}
                className={isCyan ? 'glass' : 'glass-magenta'}
                style={{ padding: '26px 26px 24px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, fontSize: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isCyan ? 'rgba(0,255,255,0.09)' : 'rgba(255,0,255,0.09)',
                    border: `1px solid ${isCyan ? 'rgba(0,255,255,0.22)' : 'rgba(255,0,255,0.22)'}`,
                    boxShadow: isCyan
                      ? '0 0 16px rgba(0,255,255,0.1), inset 0 0 10px rgba(0,255,255,0.04)'
                      : '0 0 16px rgba(255,0,255,0.1), inset 0 0 10px rgba(255,0,255,0.04)',
                  }}>
                    {f.icon}
                  </div>
                  <span className={isCyan ? 'tag' : 'tag tag-magenta'} style={{ margin: 0, fontSize: 8.5 }}>
                    {f.tag}
                  </span>
                </div>

                <h3 style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17,
                  color: 'var(--text-hi)', margin: '0 0 4px',
                }}>
                  {f.title}
                </h3>

                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 9.5,
                  color: isCyan ? 'var(--cyan)' : 'var(--magenta)',
                  letterSpacing: '.06em', marginBottom: 10,
                }}>
                  ✓ {f.benefit}
                </div>

                <p style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text-mid)', margin: 0 }}>
                  {f.desc}
                </p>

                <div style={{
                  marginTop: 18, height: 1,
                  background: isCyan
                    ? 'linear-gradient(90deg, rgba(0,255,255,0.28), transparent)'
                    : 'linear-gradient(90deg, rgba(255,0,255,0.28), transparent)',
                }} />
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: 64 }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif', color: 'var(--text-mid)',
            fontSize: 15, marginBottom: 24, lineHeight: 1.6,
          }}>
            Ready to close faster in a cooling market?
          </p>
          <FeaturesCta />
        </div>
      </div>
    </section>
  );
}
