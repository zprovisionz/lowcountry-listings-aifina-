import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

const ROADMAP_REPORTS = [
  { icon: '📊', title: 'Neighborhood Price Trends', desc: 'Median sold price, DOM, and price-per-sqft trends for Charleston-area neighborhoods.' },
  { icon: '📈', title: 'Market Velocity Report', desc: 'Absorption rates and list-to-close ratios by neighborhood and price tier.' },
  { icon: '🌊', title: 'Coastal Premium Analysis', desc: "Quantify the Shem Creek, Sullivan's Island, and Isle of Palms proximity premium." },
  { icon: '📅', title: 'Seasonal Listing Intelligence', desc: 'Best times to list by neighborhood, property type, and price band.' },
  { icon: '👥', title: 'Team Performance Dashboard', desc: 'Generations, copy rates, and listing performance across your entire team.' },
];

export default function ReportsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState(profile?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const joinWaitlist = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      toast('Enter a valid email.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('early_access_waitlist').insert({
        email: trimmed,
        source: 'reports',
      });
      if (error) throw error;
      setDone(true);
      toast("You're on the list — we'll email you when MLS-backed comps ship.", 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save — try again or email hello@lowcountrylistings.ai';
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div
        style={{
          padding: '22px 26px',
          background: 'rgba(0,255,255,0.04)',
          border: '1px solid rgba(0,255,255,0.14)',
          borderRadius: 14,
        }}
      >
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 18, color: '#eafaff', margin: '0 0 6px' }}>
          Market Intelligence
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: 'var(--text-mid)', margin: 0, lineHeight: 1.55 }}>
          Real MLS comparable sales and velocity reports are on the roadmap. We are not shipping AI-hallucinated “comps” as market data.
        </p>
      </div>

      <div className="glass" style={{ padding: 28, borderRadius: 16 }}>
        <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 'var(--text-ui-label)', color: 'var(--cyan)', letterSpacing: '.14em', marginBottom: 10 }}>
          COMING Q3 2026
        </div>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: 'var(--text-hi)', margin: '0 0 12px' }}>
          MLS-backed comps &amp; market snapshots
        </h3>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.65, margin: '0 0 20px', maxWidth: 640 }}>
          Join the early access list. When we connect to a licensed MLS feed (RESO / board-approved), you will get real sold data — not generated addresses or fabricated price ranges.
        </p>
        {done ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'var(--cyan)' }}>Thanks — watch your inbox.</p>
        ) : (
          <form onSubmit={joinWaitlist} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', maxWidth: 520 }}>
            <input
              type="email"
              required
              placeholder="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: '1 1 220px',
                padding: '12px 14px',
                background: 'rgba(5,7,24,0.9)',
                border: '1px solid rgba(0,255,255,0.22)',
                borderRadius: 9,
                color: 'var(--text-hi)',
                fontSize: 14,
              }}
            />
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Join waitlist'}
            </button>
          </form>
        )}
      </div>

      <div
        style={{
          padding: '20px 22px',
          background: 'rgba(10,10,32,0.5)',
          border: '1px dashed rgba(0,255,255,0.16)',
          borderRadius: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 'var(--text-ui-label)', color: 'var(--text-lo)', letterSpacing: '.14em', marginBottom: 4 }}>
              ON THE ROADMAP
            </div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 15, color: 'var(--text-hi)' }}>
              More Charleston market reports coming
            </div>
          </div>
          <button type="button" onClick={() => navigate('/account')} className="btn btn-ghost btn-sm">
            Billing &amp; plans →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {ROADMAP_REPORTS.map((r) => (
            <div
              key={r.title}
              style={{
                padding: '12px 14px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{r.icon}</span>
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 13, color: 'var(--text-mid)' }}>{r.title}</span>
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-lo)', lineHeight: 1.55, margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
