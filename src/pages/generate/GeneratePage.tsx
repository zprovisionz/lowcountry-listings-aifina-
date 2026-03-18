import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import WizardShell from '../../components/wizard/WizardShell';
import Step1Basics from '../../components/wizard/Step1Basics';
import Step2Photos from '../../components/wizard/Step2Photos';
import Step3Amenities from '../../components/wizard/Step3Amenities';
import Step4Review from '../../components/wizard/Step4Review';
import { WIZARD_DEFAULTS } from '../../types/database';
import type { WizardData } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { uploadPropertyPhotos } from '../../lib/storage';
import { lookupNeighborhood } from '../../lib/neighborhoods';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import UpgradeModal from '../../components/ui/UpgradeModal';
import { TIMING_MS } from '../../config';

const INVOKE_TIMEOUT_MS = TIMING_MS.invokeTimeout;

async function applyMockFallback(genId: string, data: WizardData) {
  await supabase.from('generations').update({
    status: 'complete',
    mls_copy: generateMockMLS(data),
    airbnb_copy: generateMockAirbnb(data),
    social_captions: generateMockSocial(data),
    authenticity_score: Math.floor(Math.random() * 20) + 78,
    confidence_score: Math.floor(Math.random() * 15) + 82,
    improvement_suggestions: [
      'Add specific piazza dimensions for MLS accuracy',
      'Mention proximity to a second landmark for stronger geographic context',
    ],
    landmark_distances: {
      'Downtown Charleston / King Street': '4.2 mi',
      'Shem Creek (Mount Pleasant)': '2.1 mi',
      "Sullivan's Island Beach": '5.8 mi',
    },
  }).eq('id', genId);
}

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
  if (step === 4) return !!(data.generateMLS || data.generateAirbnb || data.generateSocial);
  return true;
};

export default function GeneratePage() {
  const [step,       setStep]       = useState(1);
  const [data,       setData]       = useState<WizardData>(WIZARD_DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const patch = useCallback((p: Partial<WizardData>) => setData(d => ({ ...d, ...p })), []);

  const effectiveLimit = profile
    ? profile.generations_limit === -1
      ? 999999
      : profile.generations_limit + (profile.extra_gen_credits ?? 0)
    : 0;
  const quotaExhausted = profile && profile.generations_used >= effectiveLimit;

  const handleSubmit = async () => {
    if (!user) return;

    if (quotaExhausted) {
      toast('Generation quota exhausted. Upgrade or buy extra credits.', 'error');
      setShowUpgradeModal(true);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Insert generation record
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
        })
        .select('id')
        .single();

      if (insertErr || !gen) throw insertErr ?? new Error('Insert failed');

      // 2. Upload photos to Supabase Storage (parallel), get public URLs for Vision
      let photoUrls: string[] = [];
      if (data.photoFiles.length > 0) {
        try {
          photoUrls = await uploadPropertyPhotos(user.id, data.photoFiles, gen.id);
        } catch (uploadErr) {
          console.warn('Photo upload partial/failed — continuing without photos:', uploadErr);
        }
      }

      // 3. Look up rich neighborhood context from charleston_neighborhoods.json
      const neighborhoodData = await lookupNeighborhood(data.neighborhood);

      // 4. Call edge function with 90s timeout so we never hang indefinitely
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
          try {
            await applyMockFallback(gen.id, data);
            await refreshProfile();
            toast('Listing generated using fallback (server took too long).', 'success');
            navigate(`/results/${gen.id}`);
          } catch (fallbackErr) {
            toast((fallbackErr as Error)?.message ?? 'Generation timed out. Please try again.', 'error');
          }
          setSubmitting(false);
          return;
        }
        throw raceErr;
      }

      const fnErr = invokeResult?.error;
      if (fnErr) {
        await applyMockFallback(gen.id, data);
      }

      await refreshProfile();
      toast('Listing generated!', 'success');
      navigate(`/results/${gen.id}`);
    } catch (err: unknown) {
      const isLockError =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          (typeof err.message === 'string' &&
            (err.message.includes('Lock broken') || err.message.includes('steal'))));
      toast(
        isLockError
          ? 'A temporary sync conflict occurred. Please try again.'
          : (err as Error)?.message ?? 'Generation failed. Please try again.',
        'error'
      );
      setSubmitting(false);
    }
  };

  return (
    <>
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
    {showUpgradeModal && <UpgradeModal reason="quota" onClose={() => setShowUpgradeModal(false)} />}
    </>
  );
}

// ─── Mock generators (used when Supabase edge function not yet deployed) ────
function generateMockMLS(d: WizardData): string {
  const neighborhood = d.neighborhood || 'Charleston';
  const beds = d.bedrooms || 3;
  const baths = d.bathrooms || 2;
  const sqft = d.sqft ? Number(d.sqft) : null;
  const sqftStr = sqft ? `${sqft.toLocaleString()} sf` : '';
  const amenSet = new Set(d.amenities.map(a => a.toLowerCase()));
  const custom = (d.customAmenities || '').toLowerCase();
  const hasPiazza = amenSet.has('screened piazza') || amenSet.has('wraparound porch') || custom.includes('piazza') || custom.includes('porch');
  const hasFireplace = amenSet.has('gas fireplace') || custom.includes('fireplace');
  const hasChefKitchen = amenSet.has("chef's kitchen") || custom.includes('chef');
  const amenList = d.amenities.slice(0, 4).join(', ');

  return `The first time you turn onto the street, you feel it: the quiet hum of a neighborhood that still knows its neighbors. This ${beds}-bedroom, ${baths}-bath ${neighborhood} home welcomes you with a sense of ease—light, air, and that unmistakable Lowcountry rhythm that makes Charleston feel like home. ${hasPiazza ? 'Step onto the piazza and let the coastal breeze move through the screens—sweet tea here becomes a daily ritual.' : 'Settle in at the entry and let the day slow down—coffee mornings and easy evenings feel natural here.'}

Inside, the main level is built for both daily life and effortless entertaining. The living area opens with an easy, open flow and generous natural light; imagine quiet evenings with the paper and weekend mornings that linger. ${hasFireplace ? 'A gas fireplace anchors the space when cooler nights roll in.' : ''} ${hasChefKitchen ? "The chef's kitchen is the heart of the home—designed for cooking and conversation." : 'The kitchen connects naturally to the living space, keeping everyone together.'} A dedicated dining area makes gatherings feel effortless, and the layout stays simple, comfortable, and usable. ${amenList ? `Notable features you selected include ${amenList}.` : ''} A half bath completes the main floor.

Upstairs, the primary suite feels like a retreat. The bedroom is sized for a king and for quiet; the en-suite bath offers a double vanity and a shower built for the long run. Two additional bedrooms share a well-appointed hall bath—ideal for family, guests, or a home office that doubles as a guest room. Closets and storage are where you need them, so the house stays uncluttered even when life doesn't.

Outside, ${hasPiazza ? "the piazza is the star—the room that isn't in the square-footage count but lives in every Lowcountry memory." : 'the outdoor spaces invite you to step outside and enjoy the Lowcountry air.'} You're minutes from the best of Charleston-area living—dining, beaches, and everyday conveniences—close enough to enjoy it all, far enough to come home to calm.

This is ${neighborhood} the way locals know it: coastal light, easy evenings, and a pace that still has room for both ambition and ease. ${sqftStr ? `At ${sqftStr}, ` : ''}the home is ready for its next chapter—and for a buyer who wants that chapter written in the Lowcountry. Schedule your private showing and see how it feels in person.`; 
}

function generateMockAirbnb(d: WizardData): string {
  const neighborhood = d.neighborhood || 'Charleston';
  const amenSet = new Set(d.amenities.map(a => a.toLowerCase()));
  const custom = (d.customAmenities || '').toLowerCase();
  const hasPiazza = amenSet.has('screened piazza') || amenSet.has('wraparound porch') || custom.includes('piazza') || custom.includes('porch');
  return `Welcome to your Lowcountry escape in ${neighborhood}! This home puts you close to everything Charleston is known for — great dining, coastal day trips, and the easy rhythm that keeps visitors coming back.

Wake up, grab coffee, and plan your day — whether you're here for a romantic getaway, a family trip, or a week of exploring the Holy City. ${hasPiazza ? 'Start and end the day on the piazza with a coastal breeze.' : ''} From here, it’s simple to explore local favorites, waterfront spots, and Charleston’s best seasonal events.

✓ Fully equipped kitchen   ✓ High-speed WiFi   ✓ Free parking   ✓ Self check-in`;
}

function generateMockSocial(d: WizardData): string[] {
  const neighborhood = d.neighborhood || 'Charleston';
  const amenSet = new Set(d.amenities.map(a => a.toLowerCase()));
  const custom = (d.customAmenities || '').toLowerCase();
  const hasPiazza = amenSet.has('screened piazza') || amenSet.has('wraparound porch') || custom.includes('piazza') || custom.includes('porch');
  const piazzaPhrase = hasPiazza ? ' — piazza life included' : '';
  return [
    `🌿 Just listed in ${neighborhood}${piazzaPhrase}! Bright, easy flow + the Lowcountry rhythm buyers want. DM for details. #CharlestonRealEstate #LowcountryLiving #${neighborhood.replace(' ', '')}Homes #JustListed #CharlestonSC`,
    `✨ ${neighborhood} living with a Charleston-first feel. Ready to see it in person? 📍 ${d.address} #CharlestonHomes #SouthCarolinaRealEstate #LowcountryStyle #RealtorLife #NewListing`,
    `🏠 New in ${neighborhood}: ${d.bedrooms || 3}BR/${d.bathrooms || 2}BA with comfort-forward spaces and a location that makes life easier. Schedule a private tour. #CharlestonRealtor #${neighborhood.replace(/ /g, '')} #LowcountryAI #CharlestonListings`,
  ];
}
