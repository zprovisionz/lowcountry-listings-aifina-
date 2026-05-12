import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useGenerations } from '../../hooks/useGenerations';
import CharlestonAddressField from '../CharlestonAddressField';
import CopyButton from '../ui/CopyButton';
import UpgradeModal from '../ui/UpgradeModal';
import { detectNeighborhood } from '../../lib/detectNeighborhood';
import { lookupNeighborhood } from '../../lib/neighborhoods';
import { PROPERTY_TYPES, type AgentTone, type WizardData } from '../../types/database';
import { DEBUG, DEFAULT_FORMAT_FLAGS, TIMING_MS } from '../../config';
import { captureProductEvent } from '../../lib/product-analytics';

/**
 * Default Lowcountry-flavored amenity preset, used when the detected
 * neighborhood has no explicit defaults.
 */
const CHARLESTON_DEFAULT_AMENITIES = ['Hardwood Floors', "Chef's Kitchen", 'Quartz Countertops'];

/**
 * Map a neighborhood's `vocab` / staging hints from charleston_neighborhoods.json
 * into a sensible default amenity set drawn from AMENITY_OPTIONS.
 * Per-neighborhood overrides win; anything else falls back to the metro default.
 */
const NEIGHBORHOOD_AMENITY_DEFAULTS: Record<string, string[]> = {
  'Mount Pleasant':       ['Screened Piazza', 'Marsh Views', 'Hardwood Floors'],
  'Downtown Charleston':  ['Screened Piazza', 'Hardwood Floors', 'Shiplap Walls'],
  'West Ashley':          ['Hardwood Floors', 'Quartz Countertops', 'Outdoor Kitchen'],
  'James Island':         ['Marsh Views', 'Outdoor Kitchen', 'Hardwood Floors'],
  'Isle of Palms':        ['Ocean Views', 'Outdoor Kitchen', 'HOA Amenities'],
  'Folly Beach':          ['Ocean Views', 'Wraparound Porch', 'Hardwood Floors'],
  'Daniel Island':        ['River Views', 'Golf Course Views', "Chef's Kitchen"],
  'Summerville':          ['Wraparound Porch', "Chef's Kitchen", 'Hardwood Floors'],
  'Kiawah Island':        ['Ocean Views', 'Golf Course Views', "Chef's Kitchen"],
  'Seabrook Island':      ['Marsh Views', 'Golf Course Views', 'HOA Amenities'],
  'North Charleston':     ['Hardwood Floors', 'Shiplap Walls', "Chef's Kitchen"],
  'Goose Creek':          ['Hardwood Floors', 'Quartz Countertops', 'HOA Amenities'],
  'Hanahan':              ['Hardwood Floors', 'Quartz Countertops', "Chef's Kitchen"],
};

function amenitiesFor(neighborhood: string | null | undefined): string[] {
  if (!neighborhood) return CHARLESTON_DEFAULT_AMENITIES;
  return NEIGHBORHOOD_AMENITY_DEFAULTS[neighborhood] ?? CHARLESTON_DEFAULT_AMENITIES;
}

type QuickResult = {
  id: string;
  mls: string | null;
  neighborhood: string | null;
  address: string;
};

export default function QuickGenerateCard() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = useGenerations();

  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [propertyType, setPropertyType] = useState<WizardData['propertyType']>('single_family');
  const [bedrooms, setBedrooms] = useState<string>('');
  const [bathrooms, setBathrooms] = useState<string>('');
  const [sqft, setSqft] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Seed defaults from profile when available — but never override user typing.
  const defaultTone: AgentTone = (profile?.default_tone as AgentTone) ?? 'standard';
  const defaultFormats = profile?.default_formats ?? null;
  const defaultNeighborhood = profile?.default_neighborhood ?? '';
  const profileAmenityPresets = profile?.default_amenities_presets ?? null;

  useEffect(() => {
    if (defaultNeighborhood && !address && !neighborhood) {
      setNeighborhood(defaultNeighborhood);
    }
  }, [defaultNeighborhood, address, neighborhood]);

  const effectiveLimit = useMemo(() => {
    if (!profile) return 0;
    return profile.generations_limit === -1
      ? Number.POSITIVE_INFINITY
      : profile.generations_limit + (profile.extra_gen_credits ?? 0);
  }, [profile]);
  const quotaExhausted = profile ? profile.generations_used >= effectiveLimit : false;
  const allowUiBypass = !!(DEBUG.bypassBilling && (import.meta.env.DEV || profile?.is_test_user));

  const valid = address.trim().length > 0
    && !!propertyType
    && bedrooms !== '' && Number(bedrooms) > 0
    && bathrooms !== '' && Number(bathrooms) > 0
    && sqft !== '' && Number(sqft) > 0;

  const handleAddressManual = useCallback((v: string) => {
    setAddress(v);
    if (v.trim()) void detectNeighborhood(v).then(setNeighborhood);
    else setNeighborhood('');
  }, []);

  const handleAddressPick = useCallback((sel: { formattedAddress: string; neighborhood: string }) => {
    setAddress(sel.formattedAddress);
    setNeighborhood(sel.neighborhood);
  }, []);

  const handleSubmit = async () => {
    if (!user || !profile || !valid) return;
    if (quotaExhausted && !allowUiBypass) {
      toast('Generation quota exhausted. Upgrade or buy extra credits.', 'error');
      setShowUpgrade(true);
      return;
    }

    setSubmitting(true);
    setResult(null);

    // Resolve formats from profile defaults, else PLAN defaults — but
    // Quick Generate is MLS-first: if no profile preference is set, only MLS runs.
    const formats = defaultFormats
      ? {
          mls: defaultFormats.mls ?? DEFAULT_FORMAT_FLAGS.mls,
          airbnb: defaultFormats.airbnb ?? false,
          social: defaultFormats.social ?? false,
          email: defaultFormats.email ?? false,
        }
      : { mls: true, airbnb: false, social: false, email: false };

    // Auto-amenities: profile preset > neighborhood default > Charleston default.
    const auto = profileAmenityPresets && profileAmenityPresets.length > 0
      ? profileAmenityPresets
      : amenitiesFor(neighborhood);

    try {
      const { data: gen, error: insertErr } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          address,
          neighborhood,
          property_type: propertyType,
          bedrooms: Number(bedrooms),
          bathrooms: Number(bathrooms),
          sqft: Number(sqft),
          amenities: auto,
          photo_urls: [],
          status: 'generating',
          tone: defaultTone,
        })
        .select('id')
        .single();
      if (insertErr || !gen) throw insertErr ?? new Error('Insert failed');

      const neighborhoodData = await lookupNeighborhood(neighborhood);

      const invokePromise = supabase.functions.invoke('generate-listing', {
        body: {
          generationId:          gen.id,
          address,
          neighborhood,
          neighborhoodContext:   neighborhoodData?.keywords_for_ai ?? null,
          neighborhoodLifestyle: neighborhoodData?.lifestyle ?? [],
          propertyType,
          bedrooms: Number(bedrooms),
          bathrooms: Number(bathrooms),
          sqft: Number(sqft),
          price: '',
          amenities: auto,
          customAmenities: '',
          tone: defaultTone,
          generateMLS:    formats.mls,
          generateAirbnb: formats.airbnb,
          generateSocial: formats.social,
          generateEmail:  formats.email,
          photoUrls: [],
          overviewOnly: false,
        },
      });

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), TIMING_MS.invokeTimeout)
      );

      const invokeResult = (await Promise.race([invokePromise, timeout])) as { error?: unknown };
      if (invokeResult?.error) {
        toast('AI server hiccup — opening the full result page.', 'warning');
        navigate(`/results/${gen.id}`);
        return;
      }

      const { data: fresh } = await supabase
        .from('generations')
        .select('id, address, neighborhood, mls_copy')
        .eq('id', gen.id)
        .single();

      const row = fresh as { id: string; address: string; neighborhood: string | null; mls_copy: string | null } | null;

      await refreshProfile();
      captureProductEvent('quick_generate_used', {
        neighborhood: neighborhood || null,
        property_type: propertyType,
      });
      await trackEvent(gen.id, 'generate', {
        source: 'quick_generate',
        neighborhood: neighborhood || null,
        property_type: propertyType,
        tone: defaultTone,
      });

      setResult({
        id: gen.id,
        address: row?.address ?? address,
        neighborhood: row?.neighborhood ?? neighborhood ?? null,
        mls: row?.mls_copy ?? null,
      });
      toast('Quick listing ready!', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed.';
      if (msg === 'TIMEOUT') {
        toast('Server took too long — try again or use the full wizard.', 'warning');
      } else {
        toast(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => setResult(null);

  return (
    <div className="glass-featured anim-fade-up" style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span className="dot-live" />
        <span style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--cyan)', letterSpacing: '.14em' }}>
          QUICK GENERATE · 30s PATH
        </span>
      </div>
      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 22, color: '#eafaff', margin: '0 0 4px' }}>
        Quick Generate
      </h2>
      <p style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 10.5, color: 'var(--text-mid)', margin: '0 0 18px', letterSpacing: '.06em' }}>
        Address → MLS in 30 seconds
      </p>

      {!result && (
        <>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label className="neon-label" style={qLabelStyle}>Property Address</label>
              <CharlestonAddressField
                variant="wizard"
                manualValue={address}
                onManualChange={handleAddressManual}
                onPick={handleAddressPick}
                onClear={() => { setAddress(''); setNeighborhood(''); }}
                manualInputId="quick-generate-address"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <div>
                <label className="neon-label" style={qLabelStyle}>Property Type</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as WizardData['propertyType'])}
                  style={qSelectStyle}
                >
                  {PROPERTY_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="neon-label" style={qLabelStyle}>Bedrooms</label>
                <input
                  type="number"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="neon-input"
                  placeholder="3"
                  min={0}
                />
              </div>
              <div>
                <label className="neon-label" style={qLabelStyle}>Bathrooms</label>
                <input
                  type="number"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className="neon-input"
                  placeholder="2"
                  min={0}
                  step={0.5}
                />
              </div>
              <div>
                <label className="neon-label" style={qLabelStyle}>Sq Ft</label>
                <input
                  type="number"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  className="neon-input"
                  placeholder="1850"
                  min={0}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9.5, color: 'var(--text-lo)', letterSpacing: '.08em', lineHeight: 1.55 }}>
              {neighborhood
                ? `Auto-amenities seeded from ${neighborhood} · tone ${defaultTone}`
                : `Auto-amenities seeded from your defaults · tone ${defaultTone}`}
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!valid || submitting}
              className="btn btn-primary"
              style={{ fontSize: 13, padding: '12px 24px', opacity: !valid || submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Generating…' : '✦ Generate →'}
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--cyan)', letterSpacing: '.14em', marginBottom: 4 }}>
                MLS DESCRIPTION · QUICK GENERATE
              </div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, color: 'var(--text-hi)' }}>
                {result.address}
              </div>
              {result.neighborhood && (
                <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--text-lo)', marginTop: 4, letterSpacing: '.06em' }}>
                  ◆ {result.neighborhood}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {result.mls && (
                <CopyButton
                  text={result.mls}
                  label="COPY MLS"
                  onCopy={() => {
                    if (result.id) void trackEvent(result.id, 'copy', { scope: 'quick_generate_mls' });
                  }}
                />
              )}
              <button type="button" onClick={() => navigate(`/results/${result.id}`)} className="btn btn-ghost btn-sm">
                Open full results →
              </button>
              <button type="button" onClick={handleReset} className="btn btn-ghost btn-sm">
                + New Quick Gen
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(0,255,255,0.12)',
              borderRadius: 12,
              padding: '16px 18px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13.5,
              lineHeight: 1.7,
              color: '#c8e4ec',
              whiteSpace: 'pre-wrap',
              maxHeight: 280,
              overflow: 'auto',
            }}
          >
            {result.mls || 'MLS copy is still being polished — open full results to follow along.'}
          </div>
        </div>
      )}

      {showUpgrade && <UpgradeModal reason="quota" onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

const qLabelStyle: React.CSSProperties = { display: 'block', marginBottom: 6 };
const qSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 9,
  background: 'rgba(5,7,24,0.9)',
  border: '1px solid rgba(0,255,255,0.22)',
  color: 'var(--text-hi)',
  fontSize: 13.5,
  fontFamily: 'DM Sans, sans-serif',
};
