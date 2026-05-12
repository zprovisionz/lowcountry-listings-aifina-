import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WizardShell from '../../components/wizard/WizardShell';
import Step1Basics from '../../components/wizard/Step1Basics';
import Step2Photos from '../../components/wizard/Step2Photos';
import Step3Amenities from '../../components/wizard/Step3Amenities';
import Step4Review from '../../components/wizard/Step4Review';
import { WIZARD_DEFAULTS } from '../../types/database';
import type { WizardData, Generation, AgentTone } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { uploadPropertyPhotos } from '../../lib/storage';
import { lookupNeighborhood } from '../../lib/neighborhoods';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import UpgradeModal from '../../components/ui/UpgradeModal';
import { DEBUG, TIMING_MS } from '../../config';
import { useGenerations } from '../../hooks/useGenerations';
import { captureProductEvent } from '../../lib/product-analytics';
import neighborhoodsFile from '../../../public/charleston_neighborhoods.json';
import { type NeighborhoodsFile, findNeighborhoodBySlug } from '../../lib/neighborhoodContent';

const INVOKE_TIMEOUT_MS = TIMING_MS.invokeTimeout;

const hasAmenitiesOrCustom = (d: WizardData) =>
  d.amenities.length > 0 || d.customAmenities.trim().length > 0;

// Validates each step's required fields
const canProceed = (step: number, data: WizardData): boolean => {
  if (step === 1) {
    if (!data.address || !data.propertyType) return false;
    if (data.overviewOnly) return true;
    return (
      data.bedrooms !== '' &&
      data.bathrooms !== '' &&
      data.sqft !== '' &&
      Number(data.bedrooms) > 0 &&
      Number(data.bathrooms) > 0 &&
      Number(data.sqft) > 0
    );
  }
  if (step === 2) return true;
  if (step === 3) return data.overviewOnly || hasAmenitiesOrCustom(data);
  if (step === 4) {
    if (!(data.generateMLS || data.generateAirbnb || data.generateSocial || data.generateEmail)) return false;
    if (data.generateMLS && !data.complianceAcknowledged) return false;
    return true;
  }
  return true;
};

interface GenerationErrorState {
  message: string;
  reason: 'timeout' | 'server_error' | 'lock_conflict' | 'unknown';
}

export default function GeneratePage() {
  const [step,       setStep]       = useState(1);
  const [data,       setData]       = useState<WizardData>(WIZARD_DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [errorState, setErrorState] = useState<GenerationErrorState | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const remixId = searchParams.get('remixId');
  const neighborhoodSlug = searchParams.get('neighborhood');
  const [remixSourceAddress, setRemixSourceAddress] = useState<string | null>(null);
  const { trackEvent } = useGenerations();

  const patch = useCallback((p: Partial<WizardData>) => setData(d => ({ ...d, ...p })), []);

  // Prefill from saved "My Defaults" on first paint of a fresh generation.
  // Skipped when remixing — remix data wins. Runs only once per mount unless
  // the user is signed out and back in.
  const defaultsAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultsAppliedRef.current) return;
    if (remixId) return; // remix flow handles its own state
    if (!profile) return;
    defaultsAppliedRef.current = true;
    setData(d => {
      // Don't clobber anything the user has already touched.
      const next: WizardData = { ...d };
      const tone = profile.default_tone as AgentTone | null;
      if (tone && d.tone === WIZARD_DEFAULTS.tone) next.tone = tone;
      const f = profile.default_formats;
      if (f) {
        if (typeof f.mls    === 'boolean') next.generateMLS    = f.mls;
        if (typeof f.airbnb === 'boolean') next.generateAirbnb = f.airbnb;
        if (typeof f.social === 'boolean') next.generateSocial = f.social;
        if (typeof f.email  === 'boolean') next.generateEmail  = f.email;
      }
      if (
        Array.isArray(profile.default_amenities_presets) &&
        profile.default_amenities_presets.length > 0 &&
        d.amenities.length === 0
      ) {
        next.amenities = [...profile.default_amenities_presets];
      }
      if (profile.default_neighborhood && !d.neighborhood) {
        next.neighborhood = profile.default_neighborhood;
      }
      return next;
    });
  }, [profile, remixId]);

  // Prefill neighborhood from `/generate?neighborhood=<slug>` so deep-links from
  // /neighborhoods/:slug land with the right local context already selected.
  const prefilledNeighborhood = useMemo(() => {
    if (!neighborhoodSlug) return null;
    return findNeighborhoodBySlug(neighborhoodsFile as NeighborhoodsFile, neighborhoodSlug);
  }, [neighborhoodSlug]);

  useEffect(() => {
    if (!prefilledNeighborhood) return;
    setData(d => (d.neighborhood ? d : { ...d, neighborhood: prefilledNeighborhood.name }));
  }, [prefilledNeighborhood]);

  useEffect(() => {
    if (!remixId || !user) return;
    let cancelled = false;
    (async () => {
      const { data: row, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', remixId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled || error || !row) return;
      const g = row as Generation;
      const pt = g.property_type as string;
      const validPt = ['single_family', 'condo', 'townhouse', 'airbnb', 'land'].includes(pt) ? pt : '';
      const tn = (g.tone ?? 'standard') as WizardData['tone'];
      const validTone = ['luxury', 'family', 'investment', 'standard'].includes(tn) ? tn : 'standard';
      setData({
        ...WIZARD_DEFAULTS,
        address: g.address,
        placeId: '',
        neighborhood: g.neighborhood ?? '',
        propertyType: validPt as WizardData['propertyType'],
        bedrooms: g.bedrooms !== null && g.bedrooms !== undefined ? g.bedrooms : '',
        bathrooms: g.bathrooms !== null && g.bathrooms !== undefined ? Number(g.bathrooms) : '',
        sqft: g.sqft !== null && g.sqft !== undefined ? g.sqft : '',
        amenities: Array.isArray(g.amenities) ? [...g.amenities] : [],
        tone: validTone,
        photoFiles: [],
        photoUrls: [],
      });
      setRemixSourceAddress(g.address);
      setStep(1);
    })();
    return () => { cancelled = true; };
  }, [remixId, user]);

  const effectiveLimit = profile
    ? profile.generations_limit === -1
      ? 999999
      : profile.generations_limit + (profile.extra_gen_credits ?? 0)
    : 0;
  const quotaExhausted = profile && profile.generations_used >= effectiveLimit;
  const allowUiBypass = !!(DEBUG.bypassBilling && (import.meta.env.DEV || profile?.is_test_user));

  /**
   * Mark a previously-inserted generations row as `error` so it does not sit
   * in the user's history as a perpetual "generating…". Best-effort: a DB write
   * failure here is non-fatal — the UI error state is what the user actually sees.
   */
  const markGenerationErrored = useCallback(async (genId: string) => {
    try {
      await supabase.from('generations').update({ status: 'error' }).eq('id', genId);
    } catch {
      /* ignore — UI already informs user */
    }
  }, []);

  const reportFailure = useCallback(
    async (
      genId: string | null,
      reason: GenerationErrorState['reason'],
      detail: string,
    ) => {
      captureProductEvent('generate_failed', {
        generation_id: genId,
        reason,
        detail,
        neighborhood: data.neighborhood || null,
        tone: data.tone,
        property_type: data.propertyType,
      });
      if (genId) {
        try {
          await trackEvent(genId, 'generate', {
            event: 'generate_failed',
            reason,
            detail,
            neighborhood: data.neighborhood || null,
            tone: data.tone,
            property_type: data.propertyType,
          });
        } catch {
          /* analytics best-effort */
        }
      }
    },
    [trackEvent, data.neighborhood, data.tone, data.propertyType],
  );

  const handleSubmit = useCallback(async () => {
    if (!user) return;

    if (quotaExhausted && !allowUiBypass) {
      toast('Generation quota exhausted. Upgrade or buy extra credits.', 'error');
      setShowUpgradeModal(true);
      return;
    }

    setSubmitting(true);
    setErrorState(null);

    let createdGenId: string | null = null;

    try {
      const { data: gen, error: insertErr } = await supabase
        .from('generations')
        .insert({
          user_id:       user.id,
          address:       data.address,
          neighborhood:  data.neighborhood,
          property_type: data.propertyType,
          bedrooms:      data.overviewOnly ? null : data.bedrooms !== '' ? Number(data.bedrooms) : null,
          bathrooms:     data.overviewOnly ? null : data.bathrooms !== '' ? Number(data.bathrooms) : null,
          sqft:          data.overviewOnly ? null : data.sqft !== '' ? Number(data.sqft) : null,
          amenities:     data.overviewOnly
            ? []
            : [
                ...data.amenities,
                ...data.customAmenities.split(',').map(s => s.trim()).filter(Boolean),
              ],
          photo_urls:    [],
          status:        'generating',
          tone:          data.tone,
        })
        .select('id')
        .single();

      if (insertErr || !gen) throw insertErr ?? new Error('Insert failed');
      createdGenId = gen.id;

      let photoUrls: string[] = [];
      if (data.photoFiles.length > 0) {
        try {
          photoUrls = await uploadPropertyPhotos(user.id, data.photoFiles, gen.id);
        } catch (uploadErr) {
          console.warn('Photo upload partial/failed — continuing without photos:', uploadErr);
        }
      }

      const neighborhoodData = await lookupNeighborhood(data.neighborhood);

      const invokePromise = supabase.functions.invoke('generate-listing', {
        body: {
          generationId:        gen.id,
          address:             data.address,
          neighborhood:        data.neighborhood,
          neighborhoodContext: neighborhoodData?.keywords_for_ai ?? null,
          neighborhoodLifestyle: neighborhoodData?.lifestyle ?? [],
          propertyType:        data.propertyType,
          bedrooms:            data.bedrooms,
          bathrooms:           data.bathrooms,
          sqft:                data.sqft,
          price:               data.price,
          amenities:           data.amenities,
          customAmenities:     data.customAmenities,
          tone:                data.tone,
          generateMLS:         data.generateMLS,
          generateAirbnb:      data.generateAirbnb,
          generateSocial:      data.generateSocial,
          generateEmail:       data.generateEmail,
          photoUrls,
          overviewOnly: data.overviewOnly,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), INVOKE_TIMEOUT_MS)
      );

      let invokeResult: { data: unknown; error: unknown } | null = null;
      try {
        invokeResult = await Promise.race([invokePromise, timeoutPromise]);
      } catch (raceErr) {
        if (raceErr instanceof Error && raceErr.message === 'TIMEOUT') {
          await markGenerationErrored(gen.id);
          await reportFailure(gen.id, 'timeout', `invoke exceeded ${INVOKE_TIMEOUT_MS}ms`);
          setErrorState({
            reason: 'timeout',
            message: 'The generation server took too long to respond. Your inputs are still here — retry to try again.',
          });
          setSubmitting(false);
          return;
        }
        throw raceErr;
      }

      const fnErr = invokeResult?.error;
      if (fnErr) {
        const detail =
          (fnErr instanceof Error ? fnErr.message : null) ??
          (typeof fnErr === 'string' ? fnErr : 'edge function returned an error');
        await markGenerationErrored(gen.id);
        await reportFailure(gen.id, 'server_error', detail);
        setErrorState({
          reason: 'server_error',
          message: 'The AI server returned an error. Your inputs are still here — retry to try again.',
        });
        setSubmitting(false);
        return;
      }

      await refreshProfile();
      captureProductEvent('listing_generated', { generation_id: gen.id });
      await trackEvent(gen.id, 'generate', {
        neighborhood: data.neighborhood || null,
        tone: data.tone,
        property_type: data.propertyType,
        has_photos: photoUrls.length > 0,
        has_staging: data.applyStaging,
      });
      toast('Listing generated!', 'success');
      navigate(`/results/${gen.id}`);
    } catch (err: unknown) {
      const isLockError =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          (typeof err.message === 'string' &&
            (err.message.includes('Lock broken') || err.message.includes('steal'))));
      const reason: GenerationErrorState['reason'] = isLockError ? 'lock_conflict' : 'unknown';
      const detail = err instanceof Error ? err.message : String(err);
      if (createdGenId) await markGenerationErrored(createdGenId);
      await reportFailure(createdGenId, reason, detail);
      setErrorState({
        reason,
        message: isLockError
          ? 'A temporary sync conflict occurred. Retry to try again.'
          : (err instanceof Error && err.message) || 'Generation failed. Retry to try again.',
      });
      setSubmitting(false);
    }
  }, [
    user,
    quotaExhausted,
    allowUiBypass,
    data,
    refreshProfile,
    trackEvent,
    toast,
    navigate,
    markGenerationErrored,
    reportFailure,
  ]);

  const handleRetry = useCallback(() => {
    setErrorState(null);
    void handleSubmit();
  }, [handleSubmit]);

  return (
    <>
    {remixSourceAddress && (
      <div className="glass-dash anim-fade-up" style={{ marginBottom: 16, padding: '14px 18px', borderRadius: 12 }}>
        <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--cyan)', letterSpacing: '.12em', marginBottom: 6 }}>
          REMIX MODE
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'var(--text-mid)', margin: 0, lineHeight: 1.65 }}>
          Remixing from <strong style={{ color: 'var(--text-hi)' }}>{remixSourceAddress}</strong> — update any fields and regenerate. Photos are not copied; upload new images on step 2 if you want Vision analysis.
        </p>
      </div>
    )}
    {prefilledNeighborhood && !remixSourceAddress && (
      <div className="glass-dash anim-fade-up" style={{ marginBottom: 16, padding: '14px 18px', borderRadius: 12 }}>
        <div style={{ fontFamily: "'DM Mono', ui-monospace, monospace", fontSize: 9, color: 'var(--cyan)', letterSpacing: '.12em', marginBottom: 6 }}>
          NEIGHBORHOOD PREFILLED
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'var(--text-mid)', margin: 0, lineHeight: 1.65 }}>
          Ready to generate a listing in <strong style={{ color: 'var(--text-hi)' }}>{prefilledNeighborhood.name}</strong>. Enter a property address to auto-detect the exact neighborhood (this is just the starting context).
        </p>
      </div>
    )}

      {errorState ? (
        <GenerationErrorCard
          state={errorState}
          onRetry={handleRetry}
          onEdit={() => setErrorState(null)}
        />
      ) : (
        <WizardShell
          currentStep={step}
          onBack={()  => setStep(s => Math.max(1, s - 1))}
          onNext={()  => { if (canProceed(step, data)) setStep(s => s + 1); }}
          onSubmit={handleSubmit}
          nextDisabled={!canProceed(step, data)}
          submitting={submitting}
          nextLabel="Continue →"
        >
          {step === 1 && <Step1Basics data={data} onChange={patch} overviewOnly={data.overviewOnly} />}
          {step === 2 && <Step2Photos    data={data} onChange={patch} />}
          {step === 3 && <Step3Amenities data={data} onChange={patch} />}
          {step === 4 && <Step4Review    data={data} onChange={patch} />}
        </WizardShell>
      )}

      {showUpgradeModal && <UpgradeModal reason="quota" onClose={() => setShowUpgradeModal(false)} />}
    </>
  );
}

function GenerationErrorCard({
  state,
  onRetry,
  onEdit,
}: {
  state: GenerationErrorState;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const reasonLabel = {
    timeout:        'TIMEOUT',
    server_error:   'SERVER ERROR',
    lock_conflict:  'SYNC CONFLICT',
    unknown:        'GENERATION FAILED',
  }[state.reason];

  return (
    <div
      className="glass"
      style={{
        padding: 32,
        maxWidth: 640,
        margin: '12px auto 0',
        borderColor: 'var(--magenta-border)',
        animation: 'cardEntrance 0.45s var(--ease-expo) both',
      }}
      role="alert"
      aria-live="polite"
    >
      <div
        className="neon-label"
        style={{
          color: 'var(--magenta)',
          marginBottom: 14,
        }}
      >
        {reasonLabel}
      </div>

      <h2
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: 22,
          color: 'var(--text-hi)',
          margin: '0 0 12px',
          lineHeight: 1.25,
        }}
      >
        We couldn't finish that listing.
      </h2>

      <p
        style={{
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontSize: 14,
          lineHeight: 1.75,
          color: 'var(--text-mid)',
          margin: '0 0 22px',
        }}
      >
        {state.message}
      </p>

      <div
        style={{
          fontFamily: "'DM Mono', ui-monospace, monospace",
          fontSize: 10,
          color: 'var(--text-lo)',
          letterSpacing: '.12em',
          marginBottom: 22,
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
        }}
      >
        NO FAKE COPY HAS BEEN SAVED. NOTHING IN YOUR HISTORY IS A PLACEHOLDER.
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-primary"
          autoFocus
        >
          ↻ Retry generation
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="btn btn-ghost"
        >
          ← Back to wizard
        </button>
      </div>
    </div>
  );
}
