import { useState } from 'react';

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: 'How accurate are the landmark distances?',
    a: 'Every distance is calculated via the Google Maps Distance Matrix API — actual driving distance, not straight-line approximation. We call it in real time when you enter an address, so the "0.4 miles to Shem Creek" in your listing is a real measurement, not a guess. The 8 landmarks are fixed: Downtown Charleston (King Street), Shem Creek, Sullivan\'s Island, Isle of Palms, Folly Beach, Ravenel Bridge, Angel Oak, and Magnolia Plantation.',
  },
  {
    q: 'Is this actually Charleston-only — what if I list in Summerville or Goose Creek?',
    a: 'Yes — the address search is geographically bounded to Charleston, Berkeley, and Dorchester counties. If a property is outside that boundary, the address won\'t resolve. Summerville and Goose Creek are both within Dorchester/Berkeley county, so they\'re fully covered. Properties beyond the tri-county area simply won\'t be accepted — this is intentional. Our AI\'s hyper-local voice only works where it was trained.',
  },
  {
    q: 'Is my listing data private and secure?',
    a: 'All data lives in Supabase with row-level security (RLS) enforced at the database level — meaning your generations are cryptographically isolated from other users. We never use your listing data to train or fine-tune AI models. Your property details, photos, and generated copy are yours and only visible to your account (and your team, if you\'re on the Team plan).',
  },
  {
    q: 'How does virtual staging work, and how long does it take?',
    a: 'After generating a listing, you can upload any room photo and choose from 6 staging styles: Coastal Modern, Lowcountry Traditional, Contemporary, Minimalist, Luxury Resort, or Empty & Clean. We send it to fal.ai\'s image-to-image model and stream progress back in real time. Most images are staged in 25–45 seconds. You\'ll see a before/after slider in the results — and you can download the staged image directly to your listing photos.',
  },
  {
    q: 'Can I use this for Airbnb, VRBO, or short-term rentals?',
    a: 'Absolutely — STR is a first-class use case. The wizard includes a "Short-Term Rental" property type selector, and all Starter and above plans generate guest-focused Airbnb copy (200–250 words) calibrated for what guests actually search for: walkability, tidal creek sunrise views, pier distances, and Lowcountry lifestyle. Hosts using the Airbnb format have reported 30–40% booking increases compared to generic descriptions.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" style={{
      padding: '110px 0',
      background:
        'radial-gradient(ellipse 60% 50% at 30% 60%, rgba(0,255,255,0.022) 0%, transparent 70%),' +
        'radial-gradient(ellipse 50% 45% at 80% 30%, rgba(255,0,255,0.018) 0%, transparent 70%),' +
        '#0a0a1f',
    }}>
      <div className="section-inner">

        <div className="section-header">
          <div className="tag">FAQ</div>
          <h2 className="section-heading">
            Honest Answers to
            <br />
            <span style={{ color: 'var(--cyan)' }}>Tough Questions.</span>
          </h2>
          <p className="section-sub">
            Charleston agents are skeptical of generic AI — here's what makes this different.
          </p>
        </div>

        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                style={{
                  background: isOpen ? 'rgba(0,255,255,0.04)' : 'rgba(10,10,32,0.6)',
                  border: isOpen
                    ? '1px solid rgba(0,255,255,0.28)'
                    : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  transition: 'border-color .25s ease, background .25s ease',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Question row */}
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    padding: '20px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', gap: 16, textAlign: 'left',
                  }}
                >
                  <span style={{
                    fontFamily: 'Syne, sans-serif', fontWeight: 600,
                    fontSize: 'clamp(14px, 2vw, 16px)',
                    color: isOpen ? 'var(--cyan)' : 'var(--text-hi)',
                    lineHeight: 1.4,
                    transition: 'color .25s',
                  }}>
                    {faq.q}
                  </span>
                  <span style={{
                    flexShrink: 0,
                    width: 28, height: 28, borderRadius: '50%',
                    background: isOpen ? 'rgba(0,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isOpen ? 'rgba(0,255,255,0.35)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isOpen ? 'var(--cyan)' : 'var(--text-lo)',
                    fontSize: 16, fontWeight: 300,
                    transition: 'all .25s ease',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}>
                    +
                  </span>
                </button>

                {/* Answer */}
                <div style={{
                  maxHeight: isOpen ? 400 : 0,
                  overflow: 'hidden',
                  transition: 'max-height .35s ease',
                }}>
                  <div style={{
                    padding: '0 24px 22px',
                    borderTop: '1px solid rgba(0,255,255,0.08)',
                    paddingTop: 16,
                  }}>
                    <p style={{
                      fontFamily: 'DM Sans, sans-serif', fontSize: 14,
                      color: 'var(--text-mid)', lineHeight: 1.8,
                      margin: 0,
                    }}>
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Still have questions */}
        <div style={{ textAlign: 'center', marginTop: 52 }}>
          <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 16 }}>
            Still have questions? We're real people in Charleston.
          </p>
          <a href="mailto:hello@lowcountrylistings.ai" style={{
            fontFamily: 'Space Mono, monospace', fontSize: 11,
            color: 'var(--cyan)', letterSpacing: '.1em',
            textDecoration: 'none',
            borderBottom: '1px solid rgba(0,255,255,0.3)',
            paddingBottom: 2,
          }}>
            hello@lowcountrylistings.ai →
          </a>
        </div>

      </div>
    </section>
  );
}
