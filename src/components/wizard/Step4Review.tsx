import type { WizardData } from '../../types/database';
import { STAGING_STYLES } from '../../types/database';

interface Props { data: WizardData; onChange: (patch: Partial<WizardData>) => void; }

export default function Step4Review({ data, onChange }: Props) {
  const stagingLabel = STAGING_STYLES.find(s => s.value === data.stagingStyle)?.label ?? '';

  const Row = ({ label, value }: { label: string; value: string | number | null | undefined }) =>
    value ? (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid rgba(0,255,255,0.06)' }}>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, color: 'var(--text-lo)', letterSpacing: '.08em' }}>{label}</span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: 'var(--text-hi)', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
      </div>
    ) : null;

  const FormatToggle = ({ fieldKey, label, desc, badge }: {
    fieldKey: 'generateMLS' | 'generateAirbnb' | 'generateSocial';
    label: string; desc: string; badge: string;
  }) => {
    const on = data[fieldKey];
    return (
      <div onClick={() => onChange({ [fieldKey]: !on })} style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '15px 17px',
        background: on ? 'rgba(0,255,255,0.07)' : 'rgba(0,255,255,0.02)',
        border: `1px solid ${on ? 'rgba(0,255,255,0.32)' : 'rgba(0,255,255,0.09)'}`,
        borderRadius: 12, cursor: 'pointer',
        transition: 'all .22s ease',
        boxShadow: on ? '0 0 16px rgba(0,255,255,0.08), inset 0 0 12px rgba(0,255,255,0.03)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}>
        {on && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(0,255,255,0.5),transparent)', pointerEvents: 'none' }} />}
        {/* Checkbox */}
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: on ? 'rgba(0,255,255,0.18)' : 'rgba(0,0,0,0.3)',
          border: `1.5px solid ${on ? 'rgba(0,255,255,0.65)' : 'rgba(255,255,255,0.12)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s ease', fontSize: 11, color: 'var(--cyan)',
          boxShadow: on ? '0 0 8px rgba(0,255,255,0.3)' : 'none',
        }}>
          {on && '✓'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: on ? 'var(--text-hi)' : 'var(--text-mid)', transition: 'color .2s' }}>{label}</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-lo)', marginTop: 2 }}>{desc}</div>
        </div>
        <span style={{
          padding: '3px 9px',
          background: on ? 'rgba(0,255,255,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${on ? 'rgba(0,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 20,
          fontFamily: 'Space Mono, monospace', fontSize: 8.5, color: on ? 'var(--cyan)' : 'var(--text-lo)',
          whiteSpace: 'nowrap', transition: 'all .2s',
        }}>
          {badge}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h2 style={headSt}>Review & Generate</h2>
        <p style={subSt}>Confirm your details and choose output formats. Click Generate to unleash the AI.</p>
        {data.overviewOnly && (
          <div style={{
            marginTop: 14, padding: '12px 14px', borderRadius: 10,
            background: 'rgba(255,200,80,0.08)', border: '1px solid rgba(255,200,80,0.28)',
            fontFamily: 'DM Sans,sans-serif', fontSize: 13, color: 'rgba(255,220,160,0.95)', lineHeight: 1.55,
          }}>
            <strong>Neighborhood overview mode:</strong> MLS will be area-focused only—no invented property specs. For a full listing, turn off quick overview on step 1 and enter beds, baths, sqft, and amenities.
          </div>
        )}
      </div>

      {/* Summary card */}
      <div className="glass-dash" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ color: 'var(--cyan)', textShadow: '0 0 8px var(--cyan)' }}>◈</span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.14em' }}>PROPERTY SUMMARY</span>
        </div>

        {/* Address hero */}
        {data.address && (
          <div style={{
            padding: '12px 16px', marginBottom: 16,
            background: 'rgba(0,255,255,0.06)',
            border: '1px solid rgba(0,255,255,0.2)',
            borderRadius: 10,
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-hi)',
          }}>
            📍 {data.address}
            {data.neighborhood && (
              <span style={{ display: 'block', fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--cyan)', marginTop: 4, letterSpacing: '.08em' }}>
                ◆ {data.neighborhood}
              </span>
            )}
          </div>
        )}

        <Row label="PROPERTY TYPE" value={data.propertyType?.replace('_',' ')} />
        <Row label="BEDS / BATHS" value={data.bedrooms && data.bathrooms ? `${data.bedrooms} bd / ${data.bathrooms} ba` : null} />
        <Row label="SQ FT" value={data.sqft ? `${data.sqft.toLocaleString()} sqft` : null} />
        <Row label="YEAR BUILT" value={data.yearBuilt} />
        <Row label="LIST PRICE" value={data.price ? `$${Number(data.price).toLocaleString()}` : null} />
        <Row label="MLS #" value={data.mlsNumber} />
        <Row label="TONE" value={data.tone} />
        <Row label="STAGING" value={data.applyStaging ? stagingLabel : 'Not applied'} />

        {data.amenities.length > 0 && (
          <div style={{ paddingTop: 10 }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.08em', marginBottom: 8 }}>
              FEATURES ({data.amenities.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {data.amenities.map(a => (
                <span key={a} style={{
                  padding: '3px 9px', borderRadius: 5,
                  background: 'rgba(0,255,255,0.07)', border: '1px solid rgba(0,255,255,0.15)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, color: 'var(--text-mid)',
                }}>{a}</span>
              ))}
            </div>
          </div>
        )}

        {data.photoFiles.length > 0 && (
          <div style={{ paddingTop: 10 }}>
            <Row label="PHOTOS" value={`${data.photoFiles.length} uploaded → AI Vision analysis`} />
          </div>
        )}
      </div>

      {/* Output format toggles */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ color: 'var(--magenta)', textShadow: '0 0 8px var(--magenta)', fontSize: 13 }}>✦</span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--text-lo)', letterSpacing: '.14em' }}>OUTPUT FORMATS</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <FormatToggle fieldKey="generateMLS"     label="MLS Listing Description"       desc="350–450 words · RESO-compliant MLS format with authentic Lowcountry voice" badge="~400 words" />
          <FormatToggle fieldKey="generateAirbnb"  label="Airbnb / Short-Term Rental"    desc="200–250 words · Guest experience-first, Lowcountry vacation picture"        badge="~225 words" />
          <FormatToggle fieldKey="generateSocial"  label="Social Media Captions"         desc="3 platform-ready posts · Instagram, Facebook, LinkedIn + local hashtags"    badge="3 posts" />
        </div>
      </div>

      {/* Warning if nothing selected */}
      {!data.generateMLS && !data.generateAirbnb && !data.generateSocial && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,160,0,0.07)', border: '1px solid rgba(255,160,0,0.25)', borderRadius: 10 }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#ffaa44' }}>
            ⚠ Select at least one output format to generate.
          </span>
        </div>
      )}

      {/* AI notice */}
      <div style={{
        padding: '14px 18px',
        background: 'rgba(0,255,255,0.03)',
        border: '1px solid rgba(0,255,255,0.12)',
        borderRadius: 12,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚡</span>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.65 }}>
          <strong style={{ color: 'var(--cyan)', fontFamily: 'Syne, sans-serif' }}>GPT-4o-mini</strong> will generate your listing using Lowcountry-specific context, landmark proximity data, and neighborhood voice. Generation typically takes 15–30 seconds.
        </div>
      </div>
    </div>
  );
}

const headSt:  React.CSSProperties = { fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--text-hi)', margin: '0 0 6px' };
const subSt:   React.CSSProperties = { fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'var(--text-mid)', margin: 0, lineHeight: 1.7 };
