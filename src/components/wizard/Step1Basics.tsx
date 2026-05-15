import type { WizardData } from '../../types/database';
import { PROPERTY_TYPES } from '../../types/database';
import CharlestonAddressField from '../CharlestonAddressField';
import { detectNeighborhood } from '../../lib/detectNeighborhood';

export default function Step1Basics({
  data,
  onChange,
  overviewOnly,
}: {
  data: WizardData;
  onChange: (p: Partial<WizardData>) => void;
  overviewOnly: boolean;
}) {
  const neonField = (label: string, key: keyof WizardData, type = 'text', placeholder = '') => (
    <div>
      <label className="neon-label">{label}</label>
      <input
        type={type}
        value={data[key] as string | number}
        onChange={(e) =>
          onChange({
            [key]: type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value,
          } as Partial<WizardData>)
        }
        placeholder={placeholder}
        className="neon-input"
      />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 className="step-heading">Property Basics</h2>
        <p className="step-sub">
          Start with the property address and core details. Address must be within Charleston metro.
        </p>
      </div>

      <div>
        <label className="neon-label">Property Address *</label>
        <CharlestonAddressField
          variant="wizard"
          manualValue={data.address ?? ''}
          onManualChange={(v) =>
            onChange({
              address: v,
              placeId: '',
              neighborhood: v.trim() ? detectNeighborhood(v) : '',
            })
          }
          onPick={(sel) =>
            onChange({
              address: sel.formattedAddress,
              placeId: sel.placeId,
              neighborhood: sel.neighborhood,
            })
          }
          onClear={() => onChange({ address: '', placeId: '', neighborhood: '' })}
          manualInputId="wizard-property-address"
        />
      </div>

      <div
        onClick={() => onChange({ overviewOnly: !data.overviewOnly })}
        style={{
          padding: '14px 16px',
          borderRadius: 12,
          border: `1px solid ${data.overviewOnly ? 'rgba(255,200,80,0.35)' : 'rgba(255,255,255,0.1)'}`,
          background: data.overviewOnly ? 'rgba(255,200,80,0.06)' : 'rgba(0,0,0,0.2)',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: `2px solid ${data.overviewOnly ? 'rgba(255,200,80,0.8)' : 'rgba(255,255,255,0.25)'}`,
              background: data.overviewOnly ? 'rgba(255,200,80,0.25)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {data.overviewOnly ? '✓' : ''}
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--text-hi)',
              }}
            >
              Neighborhood overview only (quick generate)
            </div>
            <div
              style={{
                fontFamily: 'DM Sans,sans-serif',
                fontSize: 12,
                color: 'var(--text-mid)',
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              Skip bed/bath/sqft. MLS will be an area-focused overview only—no invented property details. Add full
              specs later for a complete listing.
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="neon-label">Property Type *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PROPERTY_TYPES.map(({ value, label }) => {
            const on = data.propertyType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ propertyType: value as WizardData['propertyType'] })}
                style={{
                  padding: '9px 18px',
                  background: on ? 'rgba(0,255,255,0.12)' : 'rgba(0,255,255,0.03)',
                  border: `1px solid ${on ? 'rgba(0,255,255,0.6)' : 'rgba(0,255,255,0.15)'}`,
                  borderRadius: 9,
                  cursor: 'pointer',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 600,
                  fontSize: 13,
                  color: on ? 'var(--cyan)' : 'var(--text-mid)',
                  transition: 'all .2s ease',
                  boxShadow: on ? '0 0 16px rgba(0,255,255,0.2),inset 0 0 10px rgba(0,255,255,0.05)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="wizard-field-grid">
        {neonField(overviewOnly ? 'Bedrooms (optional)' : 'Bedrooms *', 'bedrooms', 'number', '3')}
        {neonField(overviewOnly ? 'Bathrooms (optional)' : 'Bathrooms *', 'bathrooms', 'number', '2')}
        {neonField(overviewOnly ? 'Sq Ft (optional)' : 'Sq Ft *', 'sqft', 'number', '1850')}
        {neonField('Year Built', 'yearBuilt', 'number', '2005')}
        {neonField('List Price ($)', 'price', 'number', '650000')}
        {neonField('MLS #', 'mlsNumber', 'text', 'Optional')}
      </div>
    </div>
  );
}
