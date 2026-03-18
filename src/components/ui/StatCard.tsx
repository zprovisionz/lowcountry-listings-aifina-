interface StatCardProps {
  value: string | number;
  label: string;
  sub?: string;
  color?: 'cyan' | 'magenta' | 'green' | 'neutral';
  icon?: string;
  delay?: number;
  onClick?: () => void;
}

const COLOR_MAP = {
  cyan:    { border:'rgba(0,255,255,0.22)',  text:'var(--cyan)',    bg:'rgba(0,255,255,0.05)',   glow:'rgba(0,255,255,0.1)'  },
  magenta: { border:'rgba(255,0,255,0.22)',  text:'var(--magenta)', bg:'rgba(255,0,255,0.05)',   glow:'rgba(255,0,255,0.1)'  },
  green:   { border:'rgba(0,255,150,0.22)',  text:'#00ff96',        bg:'rgba(0,255,150,0.05)',   glow:'rgba(0,255,150,0.1)'  },
  neutral: { border:'rgba(255,255,255,0.09)',text:'var(--text-hi)', bg:'rgba(255,255,255,0.03)', glow:'rgba(255,255,255,0.04)' },
};

export default function StatCard({ value, label, sub, color='cyan', icon, delay=0, onClick }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      onClick={onClick}
      className="stat-card"
      style={{
        padding:'22px 22px',
        background: c.bg,
        border:`1px solid ${c.border}`,
        backdropFilter:'blur(20px)',
        cursor: onClick ? 'pointer' : 'default',
        animationDelay:`${delay}ms`,
      }}
      onMouseEnter={e => {
        if (!onClick) return;
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = `0 24px 56px rgba(0,0,0,0.5), 0 0 28px ${c.glow}`;
        el.style.borderColor = c.border.replace('0.22','0.5');
      }}
      onMouseLeave={e => {
        if (!onClick) return;
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = '';
        el.style.borderColor = c.border;
      }}
    >
      {/* Corner glow */}
      <div style={{
        position:'absolute', top:0, right:0, width:90, height:90,
        background:`radial-gradient(circle at top right, ${c.glow}, transparent)`,
        pointerEvents:'none',
      }} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <span style={{ fontFamily:'Space Mono,monospace', fontSize:9, letterSpacing:'.14em', color:'var(--text-lo)', textTransform:'uppercase' }}>
          {label}
        </span>
        {icon && <span style={{ fontSize:18, opacity:.55 }}>{icon}</span>}
      </div>

      <div style={{
        fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:38, lineHeight:1,
        color: c.text, textShadow:`0 0 24px ${c.glow}`,
      }}>
        {value}
      </div>

      {sub && (
        <div style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', marginTop:7, letterSpacing:'.06em' }}>
          {sub}
        </div>
      )}
    </div>
  );
}
