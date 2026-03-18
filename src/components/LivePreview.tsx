import { useEffect, useState, useRef } from 'react';

interface NeighborhoodData {
  name: string;
  vocab: string[];
  landmarks: Array<{ label: string; dist: string }>;
  snippet: string;
  score: number;
}

const NEIGHBORHOODS: Record<string, NeighborhoodData> = {
  'mount pleasant': {
    name: 'Mount Pleasant',
    vocab: ['piazza', 'marshfront', 'live oaks', 'tidal creek', 'Shem Creek access'],
    landmarks: [
      { label: 'Shem Creek', dist: '0.8 mi' },
      { label: 'Ravenel Bridge', dist: '2.1 mi' },
      { label: "Sullivan's Island", dist: '4.4 mi' },
    ],
    snippet: 'Nestled among live oak canopy in the heart of Mount Pleasant, this property delivers the quintessential Lowcountry lifestyle — where a sprawling piazza overlooks serene marshfront views, world-class dining along Shem Creek is minutes away, and Sullivan\'s Island beaches anchor your weekend ritual.',
    score: 91,
  },
  'downtown charleston': {
    name: 'Downtown Charleston',
    vocab: ['piazza', 'single house', 'Charleston green', 'cobblestone', 'battery views'],
    landmarks: [
      { label: 'King Street', dist: '0.3 mi' },
      { label: 'The Battery', dist: '0.9 mi' },
      { label: 'Ravenel Bridge', dist: '1.2 mi' },
    ],
    snippet: 'Steeped in 300 years of living history, this downtown gem places you steps from gaslit cobblestone streets, iconic single-house architecture, and the vibrant energy of King Street. Your wide piazza overlooks a streetscape unchanged since the antebellum era — authentic Charleston at its most compelling.',
    score: 94,
  },
  'james island': {
    name: 'James Island',
    vocab: ['coastal retreat', 'tidal creek', 'Folly access', 'wetland views', 'bridge proximity'],
    landmarks: [
      { label: 'Folly Beach', dist: '4.1 mi' },
      { label: 'Downtown Charleston', dist: '5.7 mi' },
      { label: 'Angel Oak', dist: '7.2 mi' },
    ],
    snippet: 'Experience the ideal balance of coastal serenity and city convenience on James Island — where tidal creek vistas frame your mornings, Folly Beach\'s legendary shore is a short drive, and downtown Charleston remains effortlessly accessible without the peninsula premium.',
    score: 87,
  },
  'west ashley': {
    name: 'West Ashley',
    vocab: ['Ashley River', 'plantation corridor', 'ancient live oaks', 'brackish marsh', 'tidal views'],
    landmarks: [
      { label: 'Magnolia Plantation', dist: '3.2 mi' },
      { label: 'Angel Oak', dist: '6.0 mi' },
      { label: 'Folly Beach', dist: '12.4 mi' },
    ],
    snippet: 'This West Ashley retreat sits in the shadow of the historic Plantation Corridor, where ancient moss-draped oaks line the Ashley River and the grounds of Magnolia Plantation unfold just minutes from your door — timeless Lowcountry beauty at an accessible price point.',
    score: 85,
  },
  'isle of palms': {
    name: 'Isle of Palms',
    vocab: ['beachfront', 'ocean access', 'resort living', 'IOP', 'barrier island'],
    landmarks: [
      { label: 'Isle of Palms Beach', dist: '0.4 mi' },
      { label: "Sullivan's Island", dist: '2.8 mi' },
      { label: 'Downtown Charleston', dist: '18.2 mi' },
    ],
    snippet: 'Life on Isle of Palms moves to the rhythm of the Atlantic — this barrier island property puts you steps from sugar-white shores, with resort-caliber amenities and a tight-knit coastal community that feels a world away from the mainland, yet only 18 miles from the Holy City.',
    score: 89,
  },
  default: {
    name: 'Charleston Metro',
    vocab: ['piazza', 'Lowcountry', 'live oaks', 'tidal views', 'marshfront'],
    landmarks: [
      { label: 'Downtown Charleston', dist: 'Nearby' },
      { label: 'Beaches', dist: 'Nearby' },
      { label: 'Plantation District', dist: 'Nearby' },
    ],
    snippet: 'This exceptional Charleston area property embodies the Lowcountry lifestyle at its finest — where authentic Southern hospitality, sun-drenched piazzas, and access to world-class beaches, dining, and history define an everyday that most only dream about.',
    score: 82,
  },
};

const detect = (address: string): NeighborhoodData => {
  const l = address.toLowerCase();
  if (l.includes('mount pleasant') || l.includes('mt pleasant')) return NEIGHBORHOODS['mount pleasant'];
  if (l.includes('james island'))    return NEIGHBORHOODS['james island'];
  if (l.includes('west ashley'))     return NEIGHBORHOODS['west ashley'];
  if (l.includes('isle of palms') || l.includes('iop')) return NEIGHBORHOODS['isle of palms'];
  if (l.includes('charleston'))      return NEIGHBORHOODS['downtown charleston'];
  return NEIGHBORHOODS['default'];
};

export default function LivePreview({ address }: { address: string }) {
  const [visible,  setVisible]  = useState(false);
  const [text,     setText]     = useState('');
  const [typing,   setTyping]   = useState(false);
  const [score,    setScore]    = useState(0);
  const [vocabIdx, setVocabIdx] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hood = detect(address);

  useEffect(() => {
    if (!address) { setVisible(false); setText(''); setScore(0); setVocabIdx(-1); return; }
    setVisible(false); setText(''); setScore(0); setVocabIdx(-1);

    timerRef.current = setTimeout(() => {
      setVisible(true);
      setTyping(true);
      const full = hood.snippet;
      let i = 0;
      const type = setInterval(() => {
        i++;
        if (i >= full.length) {
          clearInterval(type);
          setText(full);
          setTyping(false);
          // Animate vocab chips
          hood.vocab.forEach((_, idx) => {
            setTimeout(() => setVocabIdx(idx), idx * 120 + 200);
          });
          // Animate score
          let s = 0;
          const si = setInterval(() => {
            s += 2;
            if (s >= hood.score) { setScore(hood.score); clearInterval(si); }
            else setScore(s);
          }, 22);
        } else {
          setText(full.slice(0, i));
        }
      }, 14);
      return () => clearInterval(type);
    }, 280);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [address, hood.snippet, hood.vocab, hood.score]);

  if (!address) return null;

  return (
    <div className="anim-pop" style={{
      marginTop: 20,
      border: '1px solid rgba(0,255,255,0.4)',
      borderRadius: 16,
      background: 'rgba(0,14,32,0.75)',
      backdropFilter: 'blur(24px)',
      overflow: 'hidden',
      opacity: visible ? 1 : 0,
      transition: 'opacity .4s ease',
    }}>
      {/* Terminal header */}
      <div style={{
        padding: '10px 18px',
        background: 'rgba(0,255,255,0.05)',
        borderBottom: '1px solid rgba(0,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="dot-live" />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--cyan)', letterSpacing: '.12em' }}>
            AI PREVIEW · {hood.name.toUpperCase()}
          </span>
        </div>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57','#ffbd2e','#28c840'].map(c => (
            <div key={c} style={{ width:9, height:9, borderRadius:'50%', background:c, opacity:.8 }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 22px' }}>
        {/* Address line */}
        <div style={{
          fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--text-lo)',
          marginBottom: 14, letterSpacing: '.05em',
        }}>
          📍 {address}
        </div>

        {/* Typewriter text */}
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.8,
          color: '#c8e8f0', margin: '0 0 18px', minHeight: 80,
        }}>
          {text}
          {typing && (
            <span style={{
              display:'inline-block', width:2, height:14, background:'var(--cyan)',
              marginLeft:2, verticalAlign:'middle',
              animation:'blinkCursor .8s step-end infinite',
            }} />
          )}
        </p>

        {/* Vocab chips */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
          {hood.vocab.map((term, i) => (
            <span key={term} style={{
              padding: '4px 11px',
              background: i <= vocabIdx ? 'rgba(0,255,255,0.1)' : 'rgba(0,255,255,0.03)',
              border: `1px solid ${i <= vocabIdx ? 'rgba(0,255,255,0.4)' : 'rgba(0,255,255,0.1)'}`,
              borderRadius: 20,
              fontSize: 10, color: i <= vocabIdx ? 'var(--cyan)' : 'var(--text-lo)',
              fontFamily: 'Space Mono, monospace',
              transition: 'all .3s ease',
            }}>
              {term}
            </span>
          ))}
        </div>

        {/* Landmark distances */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginBottom:18 }}>
          {hood.landmarks.map(({ label, dist }) => (
            <div key={label} style={{
              display:'flex', alignItems:'center', gap:5,
              fontSize:10, color:'var(--text-mid)', fontFamily:'Space Mono, monospace',
            }}>
              <span style={{ color:'var(--magenta)', fontSize:9 }}>◈</span>
              <span style={{ color:'var(--text-lo)' }}>{label}</span>
              <span style={{ color:'var(--cyan)' }}>{dist}</span>
            </div>
          ))}
        </div>

        {/* Score bar */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(0,255,255,0.04)',
          borderRadius: 10, border: '1px solid rgba(0,255,255,0.1)',
          display:'flex', alignItems:'center', gap:12,
        }}>
          <span style={{ fontSize:10, color:'var(--text-lo)', fontFamily:'Space Mono, monospace', whiteSpace:'nowrap' }}>
            LOWCOUNTRY SCORE
          </span>
          <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden' }}>
            <div style={{
              height:'100%', width:`${score}%`,
              background: score > 85
                ? 'linear-gradient(90deg, #00ffff, #00ff88)'
                : 'linear-gradient(90deg, #00ffff, #ff00ff)',
              borderRadius:2, transition:'width .04s ease',
              boxShadow:'0 0 8px rgba(0,255,255,0.6)',
            }} />
          </div>
          <span style={{
            fontFamily:'Space Mono, monospace', fontSize:15, fontWeight:700,
            color: score > 85 ? 'var(--cyan)' : '#ff88ff',
            minWidth:38, textAlign:'right',
          }}>
            {score}%
          </span>
        </div>

        <div style={{ marginTop:16, textAlign:'center' }}>
          <a href="#" className="btn btn-primary" style={{ fontSize:12, padding:'10px 26px' }}>
            Generate Full Listing →
          </a>
        </div>
      </div>

      <style>{`
        @keyframes blinkCursor { 0%,100%{opacity:1}50%{opacity:0} }
        @keyframes spinRing { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
