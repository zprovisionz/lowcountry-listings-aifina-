const TESTIMONIALS = [
  {
    name:'Sarah Beaumont', role:'REALTOR®', agency:'Corcoran HM Properties',
    neighborhood:'Mount Pleasant', initials:'SB', color:'var(--cyan)',
    quote:'I\'ve tried every AI writing tool out there. None understood that a "porch" in Charleston is actually a piazza, or that buyers care deeply about Shem Creek distance. Lowcountry AI just gets it. My listings are closing 12 days faster this quarter.',
    metric:'12 days faster closing', rating:5,
  },
  {
    name:'Marcus Thibodeau', role:'Broker-in-Charge', agency:'Carolina One Real Estate',
    neighborhood:'Downtown Charleston', initials:'MT', color:'var(--magenta)',
    quote:'We onboarded our 8-person team in an afternoon. The shared quota system and custom branding made it feel like our own tool. The MLS pull alone saves us 20+ minutes per listing — and the copy is genuinely better than what we were writing manually.',
    metric:'20+ min saved per listing', rating:5,
  },
  {
    name:'Priya Nair', role:'Short-Term Rental Host', agency:'Airbnb Superhost · Folly Beach',
    neighborhood:'Folly Beach', initials:'PN', color:'var(--cyan)',
    quote:'The Airbnb copy format is exactly what guests want — it mentions the actual walk time to the pier, the tidal creek sunrise view. My bookings are up 34% since switching. Nothing else writes with this level of Lowcountry knowledge.',
    metric:'34% more bookings', rating:5,
  },
  {
    name:'James Whitfield', role:'Luxury Agent', agency:'Daniel Ravenel Sotheby\'s',
    neighborhood:'Isle of Palms', initials:'JW', color:'var(--magenta)',
    quote:'The Pro+ tier with priority processing is worth every dollar for my luxury listings. The authenticity scoring showed me exactly where I was sounding generic — I bumped my Lowcountry score from 61% to 94% in two edits.',
    metric:'94% authenticity score', rating:5,
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" style={{
      padding:'110px 0',
      background:
        'radial-gradient(ellipse 60% 50% at 75% 40%, rgba(0,255,255,0.028) 0%, transparent 70%),' +
        '#0a0a1f',
    }}>
      <div className="section-inner">
        {/* Header */}
        <div className="section-header">
          <div className="tag">Testimonials</div>
          <h2 className="section-heading">
            Charleston Agents Are
            <br />
            <span style={{ color:'var(--cyan)' }}>Winning With It.</span>
          </h2>
          <p className="section-sub">
            From downtown solo agents to multi-agent brokerages, Folly Beach Superhosts
            to Isle of Palms luxury specialists.
          </p>
        </div>

        {/* Grid */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))',
          gap:18,
        }}>
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="glass" style={{ padding:28 }}>
              {/* Big quote mark */}
              <div style={{
                fontFamily:'Syne, sans-serif', fontSize:64, lineHeight:.8,
                color: t.color, opacity:.25,
                marginBottom:4,
                fontWeight:800,
              }}>"</div>

              {/* Stars */}
              <div style={{ display:'flex', gap:3, marginBottom:14 }}>
                {Array.from({length:t.rating}).map((_,i) => (
                  <span key={i} style={{
                    color:'var(--cyan)', fontSize:12,
                    textShadow:'0 0 6px rgba(0,255,255,0.7)',
                  }}>★</span>
                ))}
              </div>

              {/* Quote */}
              <p style={{
                fontFamily:'DM Sans, sans-serif', fontSize:14,
                lineHeight:1.8, color:'#c4e0e8',
                margin:'0 0 20px', fontStyle:'italic',
              }}>
                {t.quote}
              </p>

              {/* Metric badge */}
              <div style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'5px 12px',
                background: t.color === 'var(--cyan)'
                  ? 'rgba(0,255,255,0.07)'
                  : 'rgba(255,0,255,0.07)',
                border:`1px solid ${t.color==='var(--cyan)' ? 'rgba(0,255,255,0.22)' : 'rgba(255,0,255,0.22)'}`,
                borderRadius:20, marginBottom:18,
              }}>
                <span style={{ color: t.color, fontSize:11 }}>↑</span>
                <span style={{
                  fontFamily:'Space Mono, monospace', fontSize:10,
                  color: t.color, letterSpacing:'.06em',
                }}>
                  {t.metric}
                </span>
              </div>

              <div className="divider-subtle" style={{ marginBottom:16 }} />

              {/* Author */}
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{
                  width:44, height:44, borderRadius:'50%', flexShrink:0,
                  background: t.color==='var(--cyan)'
                    ? 'linear-gradient(135deg, rgba(0,255,255,0.15), rgba(0,255,255,0.3))'
                    : 'linear-gradient(135deg, rgba(255,0,255,0.15), rgba(255,0,255,0.3))',
                  border:`1.5px solid ${t.color==='var(--cyan)'?'rgba(0,255,255,0.45)':'rgba(255,0,255,0.45)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:14,
                  color: t.color,
                  boxShadow: t.color==='var(--cyan)'
                    ? '0 0 12px rgba(0,255,255,0.2)'
                    : '0 0 12px rgba(255,0,255,0.2)',
                }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontFamily:'Syne, sans-serif', fontWeight:600, fontSize:14, color:'var(--text-hi)' }}>
                    {t.name}
                  </div>
                  <div style={{ fontFamily:'Space Mono, monospace', fontSize:9, color:'var(--text-lo)', marginTop:2 }}>
                    {t.role} · {t.neighborhood}
                  </div>
                  <div style={{ fontFamily:'Space Mono, monospace', fontSize:9, color: t.color, opacity:.6 }}>
                    {t.agency}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof footer */}
        <div style={{
          textAlign:'center', marginTop:48,
          display:'flex', justifyContent:'center', gap:36, flexWrap:'wrap',
        }}>
          {[
            { value:'2+ hrs', label:'saved per listing on average' },
            { value:'34%',    label:'avg Airbnb booking increase' },
            { value:'94%',    label:'top authenticity score achieved' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{
                fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:28,
                color:'var(--cyan)', textShadow:'0 0 18px rgba(0,255,255,0.4)',
              }}>{value}</div>
              <div style={{
                fontFamily:'Space Mono, monospace', fontSize:9,
                color:'var(--text-lo)', letterSpacing:'.1em', marginTop:4,
              }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
