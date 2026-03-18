import type { WizardData } from '../../types/database';
import { AMENITY_OPTIONS, STAGING_STYLES } from '../../types/database';

export default function Step3Amenities({ data, onChange }: { data:WizardData; onChange:(p:Partial<WizardData>)=>void }) {
  const toggle = (a:string) => {
    const next = data.amenities.includes(a) ? data.amenities.filter(x=>x!==a) : [...data.amenities,a];
    onChange({ amenities:next });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
      <div>
        <h2 className="step-heading">Features & Amenities</h2>
        <p className="step-sub">
          {data.overviewOnly
            ? 'Optional for overview mode. Select features if you want them mentioned when you add full details later.'
            : 'Select all applicable features (required: at least one chip or custom features). These are woven into your listing—only selected facts appear in copy.'}
        </p>
      </div>

      {/* Amenity chips */}
      <div>
        <label className="neon-label">Property Features ({data.amenities.length} selected)</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {AMENITY_OPTIONS.map(a => {
            const on = data.amenities.includes(a);
            return (
              <button key={a} onClick={() => toggle(a)} className={`amenity-chip${on?' active':''}`}>
                {on && <span style={{ marginRight:5, fontSize:10 }}>✓</span>}
                {a}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom */}
      <div>
        <label className="neon-label">Additional Features (comma-separated)</label>
        <input
          type="text"
          value={data.customAmenities}
          onChange={e => onChange({ customAmenities:e.target.value })}
          placeholder="e.g. Wine cellar, custom millwork, tongue-and-groove ceilings…"
          className="neon-input"
        />
      </div>

      <div className="divider-subtle" />

      {/* Staging */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <label className="neon-label" style={{ marginBottom:2 }}>Virtual Staging</label>
            <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:12.5, color:'var(--text-mid)', margin:0 }}>
              AI-staged room photos in your chosen style. Uses 1 staging credit.
            </p>
          </div>
          {/* Toggle */}
          <button onClick={() => onChange({ applyStaging:!data.applyStaging })} style={{
            width:48, height:25, borderRadius:12, padding:0, flexShrink:0,
            background: data.applyStaging ? 'linear-gradient(90deg,var(--cyan),var(--magenta))' : 'rgba(255,255,255,0.1)',
            border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', position:'relative', transition:'background .3s',
            boxShadow: data.applyStaging ? '0 0 14px rgba(0,255,255,0.3)' : 'none',
          }}>
            <div style={{
              width:17, height:17, borderRadius:'50%', background:'#fff',
              position:'absolute', top:3, left: data.applyStaging ? 27 : 3,
              transition:'left .3s var(--ease-spring)',
              boxShadow:'0 1px 4px rgba(0,0,0,0.4)',
            }} />
          </button>
        </div>

        {data.applyStaging && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(148px,1fr))', gap:10 }}>
            {STAGING_STYLES.map(({ value, label, icon }) => {
              const active = data.stagingStyle === value;
              return (
                <button key={value} onClick={() => onChange({ stagingStyle: value as WizardData['stagingStyle'] })} style={{
                  padding:'18px 12px',
                  background: active ? 'rgba(255,0,255,0.1)' : 'rgba(255,255,255,0.03)',
                  border:`1px solid ${active ? 'rgba(255,0,255,0.55)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius:12, cursor:'pointer',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                  transition:'all .25s ease',
                  boxShadow: active ? '0 0 22px rgba(255,0,255,0.18),inset 0 0 12px rgba(255,0,255,0.06)' : 'none',
                }}>
                  <span style={{ fontSize:26 }}>{icon}</span>
                  <span style={{ fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:11.5, color: active ? 'var(--magenta)' : 'var(--text-mid)', textAlign:'center' }}>
                    {label}
                  </span>
                  {active && <span style={{ fontFamily:'Space Mono,monospace', fontSize:7.5, color:'var(--magenta)', letterSpacing:'.12em' }}>SELECTED</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="divider-subtle" />

      {/* Tone */}
      <div>
        <label className="neon-label">Listing Tone</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {([
            { value:'standard',   label:'Standard',   desc:'Professional & approachable' },
            { value:'luxury',     label:'Luxury',      desc:'Elevated & aspirational' },
            { value:'family',     label:'Family',      desc:'Warm & community-focused' },
            { value:'investment', label:'Investment',  desc:'ROI & income potential' },
          ] as const).map(({ value, label, desc }) => {
            const on = data.tone === value;
            return (
              <button key={value} onClick={() => onChange({ tone:value })} style={{
                padding:'10px 16px', cursor:'pointer', textAlign:'left',
                background: on ? 'rgba(0,255,255,0.08)' : 'rgba(0,255,255,0.02)',
                border:`1px solid ${on ? 'rgba(0,255,255,0.45)' : 'rgba(0,255,255,0.1)'}`,
                borderRadius:10, transition:'all .2s ease',
                boxShadow: on ? '0 0 14px rgba(0,255,255,0.12)' : 'none',
              }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:13, color: on ? 'var(--cyan)' : 'var(--text-hi)' }}>{label}</div>
                <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:11.5, color:'var(--text-lo)', marginTop:2 }}>{desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`.neon-label{display:block;font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.14em;color:var(--text-lo);text-transform:uppercase;margin-bottom:7px}.step-heading{font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:var(--text-hi);margin:0 0 6px}.step-sub{font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text-mid);margin:0;line-height:1.7}`}</style>
    </div>
  );
}
