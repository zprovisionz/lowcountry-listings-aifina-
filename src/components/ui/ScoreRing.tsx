interface ScoreRingProps {
  value: number;
  label: string;
  color?: 'cyan' | 'magenta';
  size?: number;
}

export default function ScoreRing({ value, label, color = 'cyan', size = 92 }: ScoreRingProps) {
  const isMagenta = color === 'magenta';
  const hexColor  = isMagenta ? 'var(--magenta)' : 'var(--cyan)';
  const r    = (size / 2) - 7;
  const circ = 2 * Math.PI * r;
  const dash = circ * (value / 100);
  const grade = value >= 90 ? 'A+' : value >= 80 ? 'A' : value >= 70 ? 'B' : 'C';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ position:'relative', width:size, height:size }}>
        {/* Pulsing outer ring — from CSS */}
        <div className={`score-ring-outer${isMagenta ? ' magenta' : ''}`} />

        <svg width={size} height={size} style={{ transform:'rotate(-90deg)', animation:'scoreGlow 3s ease-in-out infinite' }}>
          {/* Track */}
          <circle cx={size/2} cy={size/2} r={r}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
          {/* Fill */}
          <circle cx={size/2} cy={size/2} r={r}
            fill="none" stroke={hexColor} strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{
              filter:`drop-shadow(0 0 8px ${hexColor})`,
              transition:'stroke-dasharray .9s var(--ease-expo)',
            }}
          />
        </svg>

        {/* Center */}
        <div style={{
          position:'absolute', inset:0,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        }}>
          <span style={{
            fontFamily:'Syne,sans-serif', fontWeight:800,
            fontSize: size * 0.22, lineHeight:1, color: hexColor,
            textShadow:`0 0 14px ${hexColor}`,
          }}>{value}</span>
          <span style={{ fontFamily:'Space Mono,monospace', fontSize: size * 0.09, color:'var(--text-lo)', letterSpacing:'.1em' }}>
            {grade}
          </span>
        </div>
      </div>
      <span style={{ fontFamily:'Space Mono,monospace', fontSize:9, color:'var(--text-lo)', letterSpacing:'.14em', textTransform:'uppercase' }}>
        {label}
      </span>
    </div>
  );
}
