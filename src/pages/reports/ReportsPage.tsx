import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const REPORT_CARDS = [
  { icon:'📊', title:'Neighborhood Price Trends',   desc:'Median sold price, DOM, and price-per-sqft trends for Charleston-area neighborhoods over the last 12 months.', tier:'pro' },
  { icon:'🏘️', title:'Comparable Listings (Comps)',  desc:'AI-generated comps for any address — estimated price range, DOM, and key differentiators for the Lowcountry market.', tier:'pro_plus' },
  { icon:'📈', title:'Market Velocity Report',       desc:'How fast are homes selling by neighborhood and price tier? Track absorption rates and list-to-close ratios.', tier:'pro' },
  { icon:'🌊', title:'Coastal Premium Analysis',     desc:'Quantify the Shem Creek, Sullivan\'s Island, and Isle of Palms proximity premium with real transaction data.', tier:'pro_plus' },
  { icon:'📅', title:'Seasonal Listing Intelligence',desc:'Best times to list by neighborhood, property type, and price band. Backed by 3 years of Charleston MLS data.', tier:'pro_plus' },
  { icon:'👥', title:'Team Performance Dashboard',   desc:'Track generations, copy rates, and listing performance across your entire team. Exportable CSV reports.', tier:'team' },
];

const TIER_ORDER = ['free','starter','pro','pro_plus','team'];

interface CompItem {
  address: string;
  price_range: string;
  dom: string;
  differentiators: string[];
}

interface CompsResponse {
  comps?: CompItem[];
  market_notes?: string;
}

export default function ReportsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const userTierIdx = TIER_ORDER.indexOf(profile?.tier ?? 'free');
  const canUseComps = profile?.tier === 'pro_plus' || profile?.tier === 'team';

  const [compsAddress, setCompsAddress] = useState('');
  const [compsNeighborhood, setCompsNeighborhood] = useState('');
  const [compsBeds, setCompsBeds] = useState('');
  const [compsBaths, setCompsBaths] = useState('');
  const [compsSqft, setCompsSqft] = useState('');
  const [compsLoading, setCompsLoading] = useState(false);
  const [compsResult, setCompsResult] = useState<CompsResponse | null>(null);

  const runComps = async () => {
    if (!compsAddress.trim() || !canUseComps) return;
    setCompsLoading(true);
    setCompsResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-comps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          address: compsAddress.trim(),
          neighborhood: compsNeighborhood.trim() || undefined,
          bedrooms: compsBeds ? parseInt(compsBeds, 10) : undefined,
          bathrooms: compsBaths ? parseFloat(compsBaths) : undefined,
          sqft: compsSqft ? parseInt(compsSqft, 10) : undefined,
          propertyType: 'single_family',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Comps failed');
      setCompsResult(json as CompsResponse);
    } catch (err) {
      setCompsResult({ comps: [], market_notes: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setCompsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{
        padding: '22px 26px',
        background: 'rgba(0,255,255,0.04)',
        border: '1px solid rgba(0,255,255,0.14)',
        borderRadius: 14,
      }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: '#eafaff', margin: '0 0 6px' }}>
          Market Intelligence
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: 'var(--text-mid)', margin: 0 }}>
          Charleston metro market reports and comparable listings.
        </p>
      </div>

      {canUseComps && (
        <div className="glass" style={{ padding: 28, borderRadius: 16 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Comparable Listings (Comps)</h3>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 20 }}>
            Enter a subject property to get 3 AI-generated comps with price range, DOM, and differentiators.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Property address"
              value={compsAddress}
              onChange={(e) => setCompsAddress(e.target.value)}
              style={{ padding: '10px 14px', background: 'rgba(5,7,24,0.9)', border: '1px solid rgba(0,255,255,0.22)', borderRadius: 9, color: 'var(--text-hi)', fontSize: 14 }}
            />
            <input
              type="text"
              placeholder="Neighborhood (optional)"
              value={compsNeighborhood}
              onChange={(e) => setCompsNeighborhood(e.target.value)}
              style={{ padding: '10px 14px', background: 'rgba(5,7,24,0.9)', border: '1px solid rgba(0,255,255,0.22)', borderRadius: 9, color: 'var(--text-hi)', fontSize: 14 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="number" placeholder="Beds" value={compsBeds} onChange={(e) => setCompsBeds(e.target.value)} style={{ padding: '10px 14px', background: 'rgba(5,7,24,0.9)', border: '1px solid rgba(0,255,255,0.22)', borderRadius: 9, color: 'var(--text-hi)', fontSize: 14, width: 80 }} />
              <input type="text" placeholder="Baths" value={compsBaths} onChange={(e) => setCompsBaths(e.target.value)} style={{ padding: '10px 14px', background: 'rgba(5,7,24,0.9)', border: '1px solid rgba(0,255,255,0.22)', borderRadius: 9, color: 'var(--text-hi)', fontSize: 14, width: 80 }} />
              <input type="number" placeholder="Sqft" value={compsSqft} onChange={(e) => setCompsSqft(e.target.value)} style={{ padding: '10px 14px', background: 'rgba(5,7,24,0.9)', border: '1px solid rgba(0,255,255,0.22)', borderRadius: 9, color: 'var(--text-hi)', fontSize: 14, flex: 1 }} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={runComps} disabled={compsLoading || !compsAddress.trim()}>
            {compsLoading ? 'Generating…' : 'Generate Comps'}
          </button>

          {compsResult && (
            <div style={{ marginTop: 24 }}>
              {compsResult.market_notes && (
                <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 16, fontStyle: 'italic' }}>{compsResult.market_notes}</p>
              )}
              {compsResult.comps && compsResult.comps.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {compsResult.comps.map((c, i) => (
                    <div key={i} className="glass" style={{ padding: 18, borderRadius: 12 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--text-hi)', marginBottom: 8 }}>{c.address}</div>
                      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--cyan)', marginBottom: 6 }}>{c.price_range}</div>
                      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--text-lo)', marginBottom: 10 }}>DOM: {c.dom}</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                        {c.differentiators?.map((d, j) => (
                          <li key={j}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>No comps returned. Try a different address.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {REPORT_CARDS.map(card => {
          const requiredIdx = TIER_ORDER.indexOf(card.tier);
          const locked = userTierIdx < requiredIdx;
          const tierLabel = card.tier.replace('_', '+').toUpperCase();
          const isCompsCard = card.title.includes('Comparable');

          return (
            <div key={card.title} style={{
              padding: '22px 22px',
              background: locked ? 'rgba(10,10,32,0.5)' : 'rgba(10,10,32,0.75)',
              border: `1px solid ${locked ? 'rgba(255,255,255,0.06)' : 'rgba(0,255,255,0.18)'}`,
              borderRadius: 14,
              backdropFilter: 'blur(16px)',
              position: 'relative', overflow: 'hidden',
              opacity: locked ? 0.7 : 1,
              transition: 'transform .25s ease, box-shadow .25s ease',
            }}
            onMouseEnter={e => { if (!locked) { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 20px 50px rgba(0,0,0,0.4), 0 0 20px rgba(0,255,255,0.08)'; }}}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = ''; }}
            >
              {locked && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  padding: '3px 9px',
                  background: 'rgba(255,0,255,0.1)',
                  border: '1px solid rgba(255,0,255,0.3)',
                  borderRadius: 20,
                  fontFamily: 'Space Mono, monospace', fontSize: 8.5,
                  color: 'var(--magenta)', letterSpacing: '.1em',
                }}>
                  🔒 {tierLabel}+
                </div>
              )}
              <div style={{ fontSize: 28, marginBottom: 12 }}>{card.icon}</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: locked ? 'var(--text-mid)' : 'var(--text-hi)', margin: '0 0 8px' }}>
                {card.title}
              </h3>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text-lo)', lineHeight: 1.65, margin: '0 0 18px' }}>
                {card.desc}
              </p>
              {locked ? (
                <button onClick={() => navigate('/account')} className="btn btn-accent btn-sm" style={{ fontSize: 10 }}>
                  Upgrade to {tierLabel} →
                </button>
              ) : isCompsCard ? (
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--cyan)' }}>Use form above</span>
              ) : (
                <span style={{
                  padding: '6px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, fontSize: 11,
                  color: 'var(--text-lo)',
                  fontFamily: 'Space Mono, monospace',
                }}>
                  Coming in Phase 2
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        padding: '14px 20px',
        background: 'rgba(255,200,0,0.04)',
        border: '1px dashed rgba(255,200,0,0.15)',
        borderRadius: 10, textAlign: 'center',
      }}>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'rgba(200,160,0,0.5)', letterSpacing: '.1em' }}>
          ADDITIONAL MARKET REPORTS LAUNCHING IN PHASE 2
        </span>
      </div>
    </div>
  );
}
