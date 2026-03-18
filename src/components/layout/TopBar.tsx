import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_META: Record<string, { title:string; sub:string }> = {
  '/dashboard': { title:'Dashboard',   sub:'Welcome back to Lowcountry AI' },
  '/generate':  { title:'Generate',    sub:'4-step listing wizard' },
  '/history':   { title:'History',     sub:'Your past generations' },
  '/reports':   { title:'Reports',     sub:'Market reports & comps' },
  '/team':      { title:'Team',        sub:'Manage your team & roles' },
  '/account':   { title:'Account',     sub:'Billing & preferences' },
  '/results':   { title:'Results',     sub:'Your generated listing' },
};

export default function TopBar({ onMobileSidebarToggle }: { onMobileSidebarToggle: () => void }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const page = Object.entries(PAGE_META).find(([k]) => pathname.startsWith(k))?.[1]
    ?? { title:'Lowcountry AI', sub:'' };

  return (
    <header style={{
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
        <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:17, color:'#eafaff', margin:0, lineHeight:1 }}>
          {page.title}
        </h1>
        {page.sub && (
          <p style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.1em', margin:'2px 0 0' }}>
            {page.sub}
          </p>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {pathname !== '/generate' && (
          <button onClick={() => navigate('/generate')} className="btn btn-primary btn-sm">
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
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)' }}>GEN</span>
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:11, color:'var(--cyan)', fontWeight:700 }}>
              {profile.generations_used}
              <span style={{ color:'var(--text-lo)' }}>/{profile.generations_limit === -1 ? '∞' : profile.generations_limit}</span>
            </span>
          </div>
        )}

        {profile && ['free','starter'].includes(profile.tier) && (
          <button onClick={() => navigate('/account')} className="btn btn-accent btn-sm">
            ↑ Upgrade
          </button>
        )}
      </div>

      <style>{`.mob-burger { display:none; } @media(max-width:768px){ .mob-burger{display:block!important;} }`}</style>
    </header>
  );
}
