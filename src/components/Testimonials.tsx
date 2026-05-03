// Honest "Built for Charleston" use-case section.
// We deliberately do not display fabricated testimonials. As real customer
// quotes come in (with written consent), they belong in this file.

const USE_CASES = [
  {
    icon: '🏡',
    tag: 'LISTING AGENTS',
    title: 'New listing, faster turnaround',
    body: 'Pull MLS-ready copy in under a minute — neighborhood detected, landmarks measured, amenities woven in. Spend the saved time on showings, not staring at a blank doc.',
    color: 'var(--cyan)',
  },
  {
    icon: '🌊',
    tag: 'STR HOSTS',
    title: 'Airbnb copy that sounds like Charleston',
    body: 'Dedicated Airbnb format calibrated for what guests actually search: walkability, tidal-creek sunrise views, Folly pier proximity. No generic "cozy retreat" filler.',
    color: 'var(--cyan)',
  },
  {
    icon: '🏛',
    tag: 'BROKERAGES',
    title: 'Team accounts with shared quota',
    body: 'Owner / Editor / Viewer roles, a single shared generation pool, custom brokerage branding, and Stripe-managed billing — onboard a 3- to 15-agent team in an afternoon.',
    color: 'var(--magenta)',
  },
  {
    icon: '📍',
    tag: 'LUXURY AGENTS',
    title: 'Authenticity scoring + edit & regenerate',
    body: 'See a Lowcountry-authenticity score on every draft and a list of specific, actionable suggestions. Re-roll a section in one click — your inputs and amenities stay locked.',
    color: 'var(--magenta)',
  },
];

const CAPABILITIES = [
  { value: '8',   label: 'Verified Charleston landmarks' },
  { value: '13',  label: 'Neighborhood profiles' },
  { value: '6',   label: 'Virtual staging styles' },
  { value: '< 60s', label: 'Typical generation time' },
];

export default function Testimonials() {
  return (
    <section id="testimonials" style={{
      padding: '110px 0',
      background:
        'radial-gradient(ellipse 60% 50% at 75% 40%, rgba(0,255,255,0.028) 0%, transparent 70%),' +
        '#0a0a1f',
    }}>
      <div className="section-inner">
        {/* Header */}
        <div className="section-header">
          <div className="tag">Built for Charleston</div>
          <h2 className="section-heading">
            One Tool, Every
            <br />
            <span style={{ color: 'var(--cyan)' }}>Charleston Workflow.</span>
          </h2>
          <p className="section-sub">
            Designed for listing agents, short-term rental hosts, brokerages, and luxury
            specialists working the tri-county metro.
          </p>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 18,
        }}>
          {USE_CASES.map((c) => (
            <div key={c.title} className="glass" style={{ padding: 28 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 11px',
                background: c.color === 'var(--cyan)' ? 'rgba(0,255,255,0.07)' : 'rgba(255,0,255,0.07)',
                border: `1px solid ${c.color === 'var(--cyan)' ? 'rgba(0,255,255,0.22)' : 'rgba(255,0,255,0.22)'}`,
                borderRadius: 20, marginBottom: 18,
              }}>
                <span style={{ fontSize: 12 }}>{c.icon}</span>
                <span style={{
                  fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9,
                  color: c.color, letterSpacing: '.12em',
                }}>
                  {c.tag}
                </span>
              </div>
              <h3 style={{
                fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
                fontSize: 17, color: 'var(--text-hi)', margin: '0 0 12px', lineHeight: 1.3,
              }}>
                {c.title}
              </h3>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 14,
                lineHeight: 1.75, color: '#c4e0e8', margin: 0,
              }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>

        {/* Capability footer (verifiable counts, not user metrics) */}
        <div style={{
          textAlign: 'center', marginTop: 48,
          display: 'flex', justifyContent: 'center', gap: 36, flexWrap: 'wrap',
        }}>
          {CAPABILITIES.map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 28,
                color: 'var(--cyan)', textShadow: '0 0 18px rgba(0,255,255,0.4)',
              }}>{value}</div>
              <div style={{
                fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9,
                color: 'var(--text-lo)', letterSpacing: '.1em', marginTop: 4,
              }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
