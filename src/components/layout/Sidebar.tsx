import { NavLink, useNavigate } from 'react-router-dom';
import { PLAN_LIMITS } from '../../config';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  label: string;
  to: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  to: '/dashboard',  icon: '⬡' },
  { label: 'Generate',   to: '/generate',   icon: '✦', badge: 'NEW' },
  { label: 'Bulk CSV',   to: '/bulk',       icon: '▤' },
  { label: 'History',    to: '/history',    icon: '◷' },
  { label: 'Reports',    to: '/reports',    icon: '◈' },
  { label: 'Analytics',  to: '/analytics',  icon: '◫' },
  { label: 'Team',       to: '/team',       icon: '◎' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Account',    to: '/account',    icon: '◉' },
];

const TIER_COLORS: Record<string, string> = {
  free: 'var(--text-lo)',
  starter: 'var(--cyan)',
  pro: 'var(--cyan)',
  pro_plus: 'var(--magenta)',
  team: 'linear-gradient(90deg, oklch(0.72 0.13 195), oklch(0.78 0.11 85))',
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const limit = profile?.generations_limit ?? PLAN_LIMITS.free.generations;
  const effectiveLimit = limit === -1 ? 999999 : limit + (profile?.extra_gen_credits ?? 0);
  const usedPct = profile
    ? (effectiveLimit > 0 ? Math.min(100, (profile.generations_used / effectiveLimit) * 100) : 0)
    : 0;

  const tierLabel = profile?.tier.replace('_', '+').toUpperCase() ?? 'FREE';
  const tierColor = profile ? TIER_COLORS[profile.tier] : 'var(--text-lo)';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside style={{
      width: collapsed ? 72 : 248,
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--space-mid) 0%, var(--space) 100%)',
      borderRight: '1px solid var(--cyan-border)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
      transition: 'width .3s var(--ease-expo)',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
      zIndex: 50,
    }}>
      {/* ─ Logo ─ */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 20px',
        borderBottom: '1px solid var(--cyan-border)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 10,
      }}>
        {!collapsed && (
          <a href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--cyan-ghost), var(--magenta-ghost))',
              border: '1px solid var(--cyan-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17,
            }}>🌿</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 14, color: 'var(--text-hi)', lineHeight: 1.1 }}>
                Lowcountry <span style={{ color: 'var(--cyan)' }}>AI</span>
              </div>
              <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 7.5, color: 'var(--text-lo)', letterSpacing: '.12em' }}>
                CHARLESTON, SC
              </div>
            </div>
          </a>
        )}
        {collapsed && (
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--cyan-ghost), var(--magenta-ghost))',
            border: '1px solid var(--cyan-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          }}>🌿</div>
        )}
        {!collapsed && (
          <button onClick={onToggle} style={iconBtnStyle} title="Collapse sidebar" aria-label="Collapse">
            ←
          </button>
        )}
      </div>

      {/* ─ Expand button when collapsed ─ */}
      {collapsed && (
        <button onClick={onToggle} style={{
          ...iconBtnStyle,
          margin: '10px auto 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} title="Expand sidebar">→</button>
      )}

      {/* ─ Main nav ─ */}
      <nav style={{ flex: 1, padding: collapsed ? '12px 8px' : '12px 12px', overflowY: 'auto' }}>
        {!collapsed && (
          <div style={{
            fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9,
            color: 'var(--text-ghost)', letterSpacing: '.18em',
            padding: '8px 8px 4px',
          }}>
            MAIN MENU
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_ITEMS.map(({ label, to, icon, badge }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: collapsed ? '10px 0' : '9px 12px',
                  borderRadius: 9,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'var(--cyan-ghost)' : 'transparent',
                  border: isActive ? '1px solid var(--cyan-border)' : '1px solid transparent',
                  transition: 'all .2s ease',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'oklch(0.72 0.13 195 / 0.05)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%',
                      width: 2, borderRadius: 1,
                      background: 'var(--cyan)',
                    }} />
                  )}
                  <span style={{
                    fontSize: 16, lineHeight: 1, flexShrink: 0,
                    color: isActive ? 'var(--cyan)' : 'var(--text-lo)',
                    transition: 'color .2s',
                  }}>
                    {icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span style={{
                        fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 13.5,
                        color: isActive ? 'var(--cyan)' : 'var(--text-mid)',
                        transition: 'color .2s',
                        flex: 1,
                      }}>
                        {label}
                      </span>
                      {badge && (
                        <span style={{
                          fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 8,
                          color: 'var(--space)', background: 'var(--cyan-dim)',
                          padding: '2px 6px', borderRadius: 4, letterSpacing: '.08em',
                        }}>
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        {/* ─ Bottom section ─ */}
        <div style={{
          marginTop: 'auto', paddingTop: 16,
          borderTop: '1px solid var(--cyan-border)',
          display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          {BOTTOM_ITEMS.map(({ label, to, icon }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: collapsed ? '10px 0' : '9px 12px',
                  borderRadius: 9, justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'var(--cyan-ghost)' : 'transparent',
                  border: isActive ? '1px solid var(--cyan-border)' : '1px solid transparent',
                  transition: 'all .2s ease', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 16, color: isActive ? 'var(--cyan)' : 'var(--text-lo)' }}>{icon}</span>
                  {!collapsed && (
                    <span style={{
                      fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 13.5,
                      color: isActive ? 'var(--cyan)' : '#8ab4c0',
                    }}>{label}</span>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ─ User + Quota footer ─ */}
      {!collapsed && profile && (
        <div style={{
          padding: '16px 16px 20px',
          borderTop: '1px solid var(--cyan-border)',
        }}>
          {/* Quota */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.1em' }}>
                GENERATIONS
              </span>
              <span style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-mid)' }}>
                {profile.generations_used} / {profile.generations_limit === -1 ? '∞' : effectiveLimit}
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${profile.generations_limit === -1 ? 40 : usedPct}%`,
                background: usedPct > 85
                  ? 'linear-gradient(90deg, oklch(0.62 0.2 25), oklch(0.78 0.11 85))'
                  : 'linear-gradient(90deg, var(--cyan), var(--magenta))',
                borderRadius: 2, transition: 'width .5s ease',
              }} />
            </div>
          </div>

          {/* Profile row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--cyan-ghost), var(--magenta-ghost))',
              border: '1px solid var(--cyan-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 13, color: 'var(--cyan)',
            }}>
              {(profile.full_name ?? profile.email)?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 12.5,
                color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {profile.full_name ?? profile.email.split('@')[0]}
              </div>
              <div style={{
                fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, letterSpacing: '.1em',
                background: typeof tierColor === 'string' && tierColor.startsWith('linear')
                  ? tierColor : undefined,
                color: typeof tierColor === 'string' && !tierColor.startsWith('linear')
                  ? tierColor : 'transparent',
                WebkitBackgroundClip: typeof tierColor === 'string' && tierColor.startsWith('linear') ? 'text' : undefined,
                backgroundClip: typeof tierColor === 'string' && tierColor.startsWith('linear') ? 'text' : undefined,
              }}>
                {tierLabel}
              </div>
            </div>
            <button onClick={handleSignOut} style={iconBtnStyle} title="Sign out" aria-label="Sign out">⏻</button>
          </div>
        </div>
      )}

      {/* Collapsed sign out */}
      {collapsed && (
        <div style={{ padding: '12px 0', borderTop: '1px solid var(--cyan-border)', display: 'flex', justifyContent: 'center' }}>
          <button onClick={handleSignOut} style={iconBtnStyle} title="Sign out">⏻</button>
        </div>
      )}
    </aside>
  );
}
const iconBtnStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--cyan-border)',
  borderRadius: 7, color: 'var(--text-lo)', cursor: 'pointer',
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, transition: 'all .2s ease', flexShrink: 0,
};

