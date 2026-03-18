import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useGenerations } from '../../hooks/useGenerations';
import StatCard from '../../components/ui/StatCard';

const TIER_FEATURES: Record<string, string[]> = {
  free:      ['10 generations/mo','MLS descriptions only','Basic analytics'],
  starter:   ['100 generations/mo','MLS + Airbnb + Social','10 staging credits'],
  pro:       ['Unlimited generations','Virtual staging (40 credits)','MLS data pull'],
  pro_plus:  ['Unlimited + priority queue','100 staging credits','Advanced reports'],
  team:      ['Unlimited shared','Multi-user seats','Custom brokerage branding'],
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const { generations, loading, fetchGenerations } = useGenerations();
  const navigate = useNavigate();

  useEffect(() => { fetchGenerations(); }, [fetchGenerations]);

  const completed = generations.filter(g => g.status === 'complete');
  const usedPct = profile ? Math.min(100,(profile.generations_used / Math.max(profile.generations_limit,1)) * 100) : 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* ── Welcome banner ── */}
      <div className="glass-featured anim-fade-up" style={{ padding:'24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span className="dot-live" />
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--cyan)', letterSpacing:'.14em' }}>
                SYSTEM ONLINE · CHARLESTON METRO
              </span>
            </div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#eafaff', margin:'0 0 4px' }}>
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
            </h2>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:13.5, color:'var(--text-mid)', margin:0 }}>
              You're on the{' '}
              <span style={{ color:'var(--cyan)', fontWeight:600 }}>
                {(profile?.tier ?? 'free').replace('_','+').toUpperCase()}
              </span>
              {' '}plan · Charleston, Berkeley & Dorchester counties only
            </p>
          </div>
          <button onClick={() => navigate('/generate')} className="btn btn-primary" style={{ fontSize:14, padding:'13px 30px' }}>
            ✦ Generate Listing →
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14 }}>
        <StatCard value={profile?.generations_used ?? 0} label="Gens Used"     sub={`of ${profile?.generations_limit === -1 ? '∞' : profile?.generations_limit ?? 10} this month`} color="cyan"    icon="⚡" delay={0}   />
        <StatCard value={completed.length}               label="Completed"      sub="All time"         color="cyan"    icon="✦"  delay={80}  onClick={() => navigate('/history')} />
        <StatCard value={profile?.staging_credits_used ?? 0} label="Staging Used" sub={`of ${profile?.staging_credits_limit === -1 ? '∞' : profile?.staging_credits_limit ?? 0}`} color="magenta" icon="🏠" delay={160} />
        <StatCard value={`${usedPct.toFixed(0)}%`}       label="Quota Used"    sub={usedPct > 80 ? '⚠ Consider upgrading' : 'Quota healthy'} color={usedPct > 80 ? 'magenta' : 'green'} icon="◈" delay={240} onClick={() => navigate('/account')} />
      </div>

      {/* ── Main row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:18, flexWrap:'wrap' }}>

        {/* Recent listings */}
        <div className="glass-dash anim-fade-up d-200">
          <div style={{
            padding:'15px 20px', borderBottom:'1px solid rgba(0,255,255,0.08)',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            background:'rgba(0,0,0,0.15)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className="dot-live" style={{ width:6, height:6 }} />
              <span style={{ fontFamily:'Space Mono,monospace', fontSize:9.5, color:'var(--text-lo)', letterSpacing:'.14em' }}>
                RECENT GENERATIONS
              </span>
            </div>
            <button onClick={() => navigate('/history')} style={{
              background:'none', border:'none', color:'var(--cyan)',
              fontFamily:'Space Mono,monospace', fontSize:9, cursor:'pointer', letterSpacing:'.1em',
              transition:'opacity .2s',
            }}>VIEW ALL →</button>
          </div>

          {loading ? (
            <div style={{ padding:24, display:'flex', flexDirection:'column', gap:10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:58 }} />)}
            </div>
          ) : completed.length === 0 ? (
            <div style={{ padding:'52px 24px', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:14 }}>📋</div>
              <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:17, color:'var(--text-hi)', margin:'0 0 6px' }}>No listings yet</p>
              <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:13.5, color:'var(--text-mid)', margin:'0 0 22px' }}>
                Generate your first Charleston listing to see it here.
              </p>
              <button onClick={() => navigate('/generate')} className="btn btn-primary btn-sm">Generate Now →</button>
            </div>
          ) : (
            completed.slice(0,6).map((g, i) => (
              <div
                key={g.id}
                onClick={() => navigate(`/results/${g.id}`)}
                className="neon-table-row"
                style={{
                  padding:'13px 20px',
                  borderBottom: i < Math.min(completed.length,6)-1 ? '1px solid rgba(0,255,255,0.05)' : 'none',
                  cursor:'pointer', display:'flex', alignItems:'center', gap:14,
                }}
              >
                <div style={{
                  width:36, height:36, borderRadius:8, flexShrink:0,
                  background:'rgba(0,255,255,0.07)',
                  border:'1px solid rgba(0,255,255,0.2)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                }}>🏠</div>
                <div style={{ flex:1, overflow:'hidden' }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:13.5, color:'#eafaff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {g.address}
                  </div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', marginTop:2 }}>
                    {g.neighborhood ?? 'Charleston'} · {new Date(g.created_at).toLocaleDateString()}
                  </div>
                </div>
                {g.authenticity_score != null && (
                  <div style={{
                    padding:'3px 9px',
                    background:'rgba(0,255,255,0.07)', border:'1px solid rgba(0,255,255,0.22)',
                    borderRadius:6, fontFamily:'Space Mono,monospace', fontSize:10,
                    color:'var(--cyan)', fontWeight:700,
                    boxShadow:'0 0 8px rgba(0,255,255,0.1)',
                  }}>
                    {g.authenticity_score}%
                  </div>
                )}
                <span style={{ color:'var(--text-lo)', fontSize:13 }}>→</span>
              </div>
            ))
          )}
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Quick actions */}
          <div className="glass-dash anim-fade-up d-300" style={{ padding:'18px 18px' }}>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.14em', marginBottom:14 }}>
              QUICK ACTIONS
            </div>
            {([
              { icon:'✦', label:'New Listing',    sub:'4-step wizard',     to:'/generate', color:'var(--cyan)'    },
              { icon:'◷', label:'View History',   sub:'Past generations',  to:'/history',  color:'var(--magenta)' },
              { icon:'◈', label:'Market Reports', sub:'Comps & analytics', to:'/reports',  color:'var(--cyan)'    },
              { icon:'◎', label:'Team Settings',  sub:'Manage your team',  to:'/team',     color:'var(--magenta)' },
            ]).map(({ icon, label, sub, to, color }) => (
              <div
                key={to}
                onClick={() => navigate(to)}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'9px 10px', borderRadius:8, cursor:'pointer',
                  transition:'background .2s', marginBottom:2,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,255,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <span style={{ fontSize:16, color, width:20, textAlign:'center', textShadow:`0 0 8px ${color}` }}>{icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:13, color:'#eafaff' }}>{label}</div>
                  <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)' }}>{sub}</div>
                </div>
                <span style={{ color:'var(--text-lo)', fontSize:12 }}>→</span>
              </div>
            ))}
          </div>

          {/* Plan card */}
          <div className="glass-magenta anim-fade-up d-400" style={{ padding:'18px 18px' }}>
            <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.14em', marginBottom:10 }}>
              YOUR PLAN
            </div>
            <div className="shimmer-text" style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:18, marginBottom:12 }}>
              {(profile?.tier ?? 'free').replace('_','+').toUpperCase()}
            </div>
            {(TIER_FEATURES[profile?.tier ?? 'free'] ?? []).map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--text-mid)', marginBottom:6, fontFamily:'DM Sans,sans-serif' }}>
                <span style={{ color:'var(--cyan)', fontSize:10 }}>✓</span>
                {f}
              </div>
            ))}
            {['free','starter'].includes(profile?.tier ?? 'free') && (
              <button onClick={() => navigate('/account')} className="btn btn-accent btn-sm" style={{ width:'100%', marginTop:14, justifyContent:'center' }}>
                ↑ Upgrade Plan →
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:960px){
          .dashboard-main { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}
