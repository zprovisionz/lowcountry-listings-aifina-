import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { DEBUG } from '../../config';

const PAGE_META: Record<string, { title:string; sub:string }> = {
  '/dashboard': { title:'Dashboard',   sub:'Welcome back to Lowcountry AI' },
  '/generate':  { title:'Generate',    sub:'' },
  '/history':   { title:'History',     sub:'Your past generations' },
  '/reports':   { title:'Reports',     sub:'MLS comps waitlist — roadmap' },
  '/analytics': { title:'Analytics',   sub:'Listing performance' },
  '/bulk':      { title:'Bulk CSV',    sub:'Starter+ portfolio import' },
  '/team':      { title:'Team',        sub:'Manage your team & roles' },
  '/account':   { title:'Account',     sub:'Billing & preferences' },
  '/results':   { title:'Results',     sub:'Your generated listing' },
};

export default function TopBar({ onMobileSidebarToggle }: { onMobileSidebarToggle: () => void }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const allowUiBypass = !!(DEBUG.bypassBilling && (import.meta.env.DEV || profile?.is_test_user));

  const page = Object.entries(PAGE_META).find(([k]) => pathname.startsWith(k))?.[1]
    ?? { title:'Lowcountry AI', sub:'' };

  return (
    <header className="app-topbar" style={{
      height:64, position:'sticky', top:0, zIndex:40,
      borderBottom:'1px solid rgba(0,255,255,0.1)',
      background:'rgba(5,5,18,0.9)',
      backdropFilter:'blur(24px) saturate(1.6)',
      display:'flex', alignItems:'center', padding:'0 24px', gap:16,
    }}>
      {/* Mobile burger */}
      <button
        onClick={onMobileSidebarToggle}
        aria-label="Toggle sidebar"
        style={{
          display:'none', background:'transparent', border:'none',
          color:'var(--cyan)', cursor:'pointer', fontSize:20, padding:4,
        }}
        className="mob-burger"
      >☰</button>

      {/* Title */}
      <div style={{ flex:1 }}>
        <h1 style={{ fontFamily:"'Playfair Display', Georgia, serif", fontWeight:800, fontSize:17, color:'#eafaff', margin:0, lineHeight:1 }}>
          {page.title}
        </h1>
        {page.sub && (
          <p className="topbar-subtitle" style={{ fontFamily:"'DM Mono', ui-monospace, monospace", fontSize:'var(--text-ui-label)', color:'var(--text-lo)', letterSpacing:'.1em', margin:'2px 0 0' }}>
            {page.sub}
          </p>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {allowUiBypass && (
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 10px',
            background:'rgba(255,0,255,0.10)',
            border:'1px solid rgba(255,0,255,0.28)',
            borderRadius:999,
          }}>
            <span style={{ fontFamily:"'DM Mono', ui-monospace, monospace", fontSize:9, letterSpacing:'.14em', color:'var(--magenta)', fontWeight:800 }}>
              TEST MODE
            </span>
          </div>
        )}
        {!pathname.startsWith('/generate') && !pathname.startsWith('/results') && (
          <button onClick={() => navigate('/generate')} className="btn btn-primary btn-sm topbar-quick-gen">
            ✦ Quick Generate
          </button>
        )}

        {profile && (
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 12px',
            background:'rgba(0,255,255,0.05)',
            border:'1px solid rgba(0,255,255,0.18)',
            borderRadius:20,
          }}>
            <span style={{ fontFamily:"'DM Mono', ui-monospace, monospace", fontSize:9, color:'var(--text-lo)' }}>GEN</span>
            <span style={{ fontFamily:"'DM Mono', ui-monospace, monospace", fontSize:11, color:'var(--cyan)', fontWeight:700 }}>
              {profile.generations_used}
              <span style={{ color:'var(--text-lo)' }}>
                /{profile.generations_limit === -1
                  ? '∞'
                  : profile.generations_limit + (profile.extra_gen_credits ?? 0)}
              </span>
            </span>
          </div>
        )}

        {profile && ['free','starter'].includes(profile.tier) && (
          <button onClick={() => navigate('/account')} className="btn btn-accent btn-sm">
            ↑ Upgrade
          </button>
        )}
      </div>

    </header>
  );
}
