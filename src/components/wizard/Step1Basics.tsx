import type { WizardData } from '../../types/database';
import { PROPERTY_TYPES } from '../../types/database';
import CharlestonAddressField from '../CharlestonAddressField';
import { detectNeighborhood } from '../../lib/detectNeighborhood';
import { useAuth } from '../../contexts/AuthContext';
import { remainingStagingCredits } from '../../lib/stagingCredits';

export default function Step1Basics({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (p: Partial<WizardData>) => void;
}) {
  const { profile } = useAuth();
  const overviewOnly = data.overviewOnly;
  const stagingRem =
    profile && remainingStagingCredits(profile) === Number.POSITIVE_INFINITY
      ? '∞'
      : profile
        ? String(Math.floor(remainingStagingCredits(profile)))
        : null;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 className="step-heading">Property Basics</h2>
        <p className="step-sub" style={{ marginBottom: 0 }}>
          Address and core details (Charleston metro).{' '}
          <span style={{ color: 'var(--text-lo)' }}>Optional quick mode skips required bed/bath/sqft.</span>
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

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          userSelect: 'none',
          marginTop: -4,
        }}
        title="MLS-style overview focused on neighborhood and area only—no invented bed/bath/sqft. Turn off for a full spec-driven listing."
      >
        <input
          type="checkbox"
          checked={overviewOnly}
          onChange={(e) => onChange({ overviewOnly: e.target.checked })}
          style={{
            width: 16,
            height: 16,
            accentColor: 'var(--cyan)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'DM Mono', ui-monospace, monospace",
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: overviewOnly ? 'var(--cyan)' : 'var(--text-mid)',
          }}
        >
          Quick generate — overview only
        </span>
      </label>

      {profile && stagingRem !== null && (
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12.5,
            color: 'var(--text-lo)',
            margin: '-2px 0 0',
            lineHeight: 1.5,
          }}
          title="Staging credits are used on the Results page after you generate a listing (1 credit per staged photo)."
        >
          Staging credits remaining: <strong style={{ color: 'var(--magenta)' }}>{stagingRem}</strong>
          {profile.staging_credits_limit !== -1 && (profile.extra_staging_credits ?? 0) > 0 && (
            <span style={{ color: 'var(--text-ghost)' }}> (incl. purchased packs)</span>
          )}
        </p>
      )}

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
                  padding: '8px 16px',
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
