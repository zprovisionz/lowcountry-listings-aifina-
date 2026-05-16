import { useMemo, useState } from 'react';
import type { WizardData } from '../../types/database';
import { AMENITY_GROUPS } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import {
  remainingStagingCredits,
  stagingBatchCapForTier,
  stagingSelectionCapForUi,
} from '../../lib/stagingCredits';
import { DEBUG } from '../../config';

const TONE_OPTIONS = [
  { value: 'standard', label: 'Standard', desc: 'Professional & approachable' },
  { value: 'luxury', label: 'Luxury', desc: 'Elevated & aspirational' },
  { value: 'vacation', label: 'Vacation / STR', desc: 'Booking-driven & lifestyle' },
  { value: 'investment', label: 'Investment', desc: 'ROI & income potential' },
] as const;

export default function Step3Amenities({ data, onChange }: { data: WizardData; onChange: (p: Partial<WizardData>) => void }) {
  const { profile } = useAuth();
  const allowBypass = !!(DEBUG.bypassBilling && (import.meta.env.DEV || profile?.is_test_user));
  const photoN = data.photoFiles.length;
  const tierCap = stagingBatchCapForTier(profile?.tier);
  const selectCap = stagingSelectionCapForUi(profile, profile?.tier, photoN, allowBypass);
  const rem = profile ? remainingStagingCredits(profile) : 0;
  const remLabel = rem === Number.POSITIVE_INFINITY ? '∞' : String(Math.floor(rem));

  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!q) return AMENITY_GROUPS;
    return AMENITY_GROUPS
      .map((g) => ({ ...g, items: g.items.filter((a) => a.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [q]);

  const toggle = (a: string) => {
    const next = data.amenities.includes(a) ? data.amenities.filter((x) => x !== a) : [...data.amenities, a];
    onChange({ amenities: next });
  };

  const selectedCount = data.amenities.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 className="step-heading">Features & Amenities</h2>
        <p className="step-sub" style={{ marginBottom: 0 }}>
          {data.overviewOnly
            ? 'Optional for overview mode. Select features if you want them mentioned when you add full details later.'
            : 'Select all applicable features (required: at least one chip or custom features). These are woven into your listing—only selected facts appear in copy.'}
        </p>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label className="neon-label" style={{ marginBottom: 0 }}>
            Property Features
            {selectedCount > 0 && (
              <span className="amenity-count-badge" aria-label={`${selectedCount} selected`}>{selectedCount}</span>
            )}
          </label>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => onChange({ amenities: [] })}
              className="amenity-clear-btn"
              aria-label="Clear all selected features"
            >
              Clear all
            </button>
          )}
        </div>

        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Find a feature…"
          className="neon-input amenity-search"
          aria-label="Filter features"
        />

        {selectedCount > 0 && (
          <div className="amenity-selected-row" aria-label="Selected features">
            {data.amenities.map((a) => (
              <button
                key={a}
                type="button"
                className="amenity-selected-pill"
                onClick={() => toggle(a)}
                aria-label={`Remove ${a}`}
              >
                <span>{a}</span>
                <span className="amenity-pill-x" aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        )}

        {filteredGroups.length === 0 ? (
          <p className="amenity-empty">No features match — add it as a custom feature below.</p>
        ) : (
          <div className="amenity-groups">
            {filteredGroups.map((group) => (
              <div key={group.label} className="amenity-group">
                <div className="amenity-group-label">{group.label}</div>
                <div className="amenity-group-chips">
                  {group.items.map((a) => {
                    const on = data.amenities.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggle(a)}
                        className={`amenity-chip${on ? ' active' : ''}`}
                        aria-pressed={on}
                      >
                        {on && <span style={{ marginRight: 5, fontSize: 12 }}>✓</span>}
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="neon-label">Additional Features (comma-separated)</label>
        <input
          type="text"
          value={data.customAmenities}
          onChange={(e) => onChange({ customAmenities: e.target.value })}
          placeholder="e.g. Wine cellar, custom millwork, tongue-and-groove ceilings…"
          className="neon-input"
        />
      </div>

      <div className="divider-subtle" />

      <div className="glass-magenta" style={{ padding: '12px 14px', borderRadius: 12 }}>
        <div className="neon-label" style={{ marginBottom: 6 }}>
          Virtual staging (after Results)
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text-mid)', margin: 0, lineHeight: 1.6 }}>
          Staging does <strong style={{ color: 'var(--text-hi)' }}>not</strong> run when you press Generate. On the Results page, pick your photos, choose a style, and spend{' '}
          <strong style={{ color: 'var(--text-hi)' }}>1 staging credit per photo</strong> (batch limits: Starter up to {stagingBatchCapForTier('starter')} per run, Pro+ up to{' '}
          {stagingBatchCapForTier('pro')}).
        </p>
        {photoN > 0 && profile && (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 12.5,
              color: 'var(--text-lo)',
              margin: '10px 0 0',
              lineHeight: 1.55,
            }}
            title="Credits include your plan pool plus any purchased packs."
          >
            {selectCap > 0 || allowBypass ? (
              <>
                With your {photoN} uploaded photo{photoN === 1 ? '' : 's'}, you could stage up to <strong style={{ color: 'var(--cyan)' }}>{selectCap}</strong> per run right now
                {tierCap > 0 ? ` (plan batch max ${tierCap})` : ''}. Remaining credits: <strong style={{ color: 'var(--magenta)' }}>{remLabel}</strong>.
              </>
            ) : (
              <>
                Staging needs credits after you generate. Remaining: <strong style={{ color: 'var(--magenta)' }}>0</strong> — upgrade from Free for staging.
              </>
            )}
          </p>
        )}
      </div>

      <div className="divider-subtle" />

      <div>
        <label className="neon-label">Listing Tone</label>
        <div className="tone-grid">
          {TONE_OPTIONS.map(({ value, label, desc }) => {
            const on = data.tone === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ tone: value })}
                className={`tone-chip${on ? ' active' : ''}`}
                aria-pressed={on}
              >
                <div className="tone-chip-label">{label}</div>
                <div className="tone-chip-desc">{desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
