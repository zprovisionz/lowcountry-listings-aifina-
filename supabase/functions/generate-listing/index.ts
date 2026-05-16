// supabase/functions/generate-listing/index.ts
// Deploy with: supabase functions deploy generate-listing
//
// This edge function:
// 1. Receives wizard payload from the React client
// 2. (Optional) Runs OpenAI Vision on uploaded property photos
// 3. Calls OpenAI GPT-4o-mini to generate MLS / Airbnb / Social copy
// 4. Calls Google Maps Distance Matrix for landmark distances
// 5. Scores authenticity and confidence
// 6. Updates the generation row in Supabase

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOW_TEST_MODE = (Deno.env.get('ALLOW_TEST_MODE') ?? '').toLowerCase() === 'true';

async function isAllowedTestGeneration(
  supabase: ReturnType<typeof createClient>,
  generationId: string
): Promise<boolean> {
  if (!ALLOW_TEST_MODE) return false;
  try {
    const { data: row } = await supabase
      .from('generations')
      .select('user_id')
      .eq('id', generationId)
      .single();
    const userId = (row as { user_id?: string } | null)?.user_id;
    if (!userId) return false;
    const { data } = await supabase.rpc('is_test_user', { p_user_id: userId });
    return !!data;
  } catch {
    return false;
  }
}

const LANDMARKS: Record<string, { lat: number; lng: number }> = {
  'Downtown Charleston / King Street': { lat: 32.7765, lng: -79.9311 },
  'Shem Creek (Mount Pleasant)':       { lat: 32.7936, lng: -79.8841 },
  "Sullivan's Island Beach":           { lat: 32.7657, lng: -79.8425 },
  'Isle of Palms Beach':               { lat: 32.7873, lng: -79.7971 },
  'Folly Beach':                       { lat: 32.6551, lng: -79.9403 },
  'Ravenel Bridge':                    { lat: 32.7957, lng: -79.9330 },
  'Angel Oak Tree':                    { lat: 32.7068, lng: -80.0988 },
  'Magnolia Plantation':               { lat: 32.8187, lng: -80.0986 },
};

const NEIGHBORHOOD_VOCAB: Record<string, string[]> = {
  'Downtown Charleston':  ['single house','piazza','cobblestone','gaslit streets','Charleston green','King Street','heart-pine floors','transom windows'],
  'Mount Pleasant':       ['piazza','marshfront','live oaks','tidal creek','Shem Creek proximity','Lowcountry','pluff mud','moss-draped oaks'],
  'West Ashley':          ['Ashley River','plantation corridor','ancient oaks','brackish marsh','Magnolia Plantation proximity'],
  'James Island':         ['tidal creek','coastal retreat','wetland views','Folly Beach proximity','marsh dock'],
  'Isle of Palms':        ['beachfront','barrier island','ocean access','resort living','Wild Dunes','vacation rental income'],
  'Folly Beach':          ['oceanfront','beach town','surf culture','Atlantic views','Edge of America','Morris Island Lighthouse views'],
  'Daniel Island':        ['planned community','riverwalk','championship golf','deepwater access','Daniel Island Club','Wando River'],
  'Summerville':          ['historic downtown','live oak boulevard','Southern charm','azalea gardens','Flowertown','Azalea Festival'],
  'Kiawah Island':        ['gated community','championship golf','The Ocean Course','beach club','luxury enclave','loggerhead sea turtles'],
  'Seabrook Island':      ['private island community','Equestrian Center','Bohicket Marina','unspoiled maritime forest','horse trails'],
  'North Charleston':     ['Park Circle','midcentury modern','craftsman bungalow','revitalized district','arts district','brewery scene'],
  'Goose Creek':          ['Berkeley County','Crowfield Plantation','Goose Creek Reservoir','established community','mature trees'],
  'Hanahan':              ['Cooper River proximity','Berkeley County','boat ramp access','quiet residential'],
};

// Short style anchors only — long few-shot paragraphs encouraged feature mimicry.
const MLS_STYLE_ANCHORS = `
MLS VOICE ANCHORS (rhythm only — do NOT import features, room counts, or finishes from these ideas):
- Alternate short factual sentences with one softer neighborhood/atmosphere line.
- Ground credibility in the address, neighborhood name, and the exact landmark distance strings provided.
- When amenities are sparse, write a shorter interior section rather than inventing rooms or finishes.
`;

function mlsToneGuidance(tone: string | undefined): string {
  const t = (tone ?? 'standard').toLowerCase();
  if (t === 'luxury') {
    return `TONE=luxury: confident and spare; shorter sentences; no hype words ("stunning","exclusive","world-class"); still zero invented finishes or layout claims.`;
  }
  if (t === 'family') {
    return `TONE=family: warm and practical; emphasize livability using ONLY beds/baths/sqft and listed amenities; do not invent schools, yards, or kid-specific features unless in facts/photos.`;
  }
  if (t === 'investment') {
    return `TONE=investment: crisp and numbers-forward; lead with specs from facts; no rental income or cap-rate claims unless price + explicit investment notes support them.`;
  }
  return `TONE=standard: professional and approachable; at most ONE metaphorical image (e.g. breeze, neighborhood rhythm) per ~150 words; ban purple phrases ("warm embrace","enchanting","beckons","swept away","hidden gem").`;
}

const LANDMARK_USE_RULES = `LANDMARKS:
- You may reference at most THREE named places, and ONLY those appearing in the "Landmark distances" line with their EXACT parenthetical distance text.
- Never write "minutes away", "just moments", or "short drive" unless the distance text explicitly supports it (e.g. "2 mi" is fine; do not invent time estimates).
- Do not add landmarks not listed in that line.`;

const VOICE_DISCIPLINE = `VOICE DISCIPLINE:
- Do not stack multiple metaphors in the same paragraph.
- Prefer concrete nouns (street trees, porch, commute) over abstract "allure" or "embrace" framing.
- Avoid realtor clichés: stunning, must-see, won't last, move-in ready, dream home, hidden gem, resort-like (unless a resort amenity is listed).`;

const MLS_OUTLINE_RULES = `MLS DESCRIPTION STRUCTURE (400–450 words unless facts are too thin—then shorter is better than padding):
(1) Opening 2–3 sentences: arrival / neighborhood context using ONLY neighborhood name, property type, and facts—no invented curb appeal.
(2) One tight paragraph: state beds, baths, and sqft from AUTHORIZED FACTS in MLS-standard wording; if any are "not specified", omit that line entirely.
(3) Interior & features: ONLY amenities explicitly listed OR clearly supported in Photo-derived details. If the amenity list is a single item, write ONE focused paragraph about that feature—do not invent a tour of other rooms.
(4) Lifestyle paragraph: use ONLY the landmark distance strings provided (max 3 places). Area character is OK without inventing mileage.
(5) Close with a simple private-tour CTA (no urgency gimmicks).
End with a separate line exactly: [Word count: XXX]`;

// ─── Vision: analyze property photos ────────────────────────────────────────
async function analyzePhotosWithVision(photoUrls: string[], openAiKey: string): Promise<string> {
  if (!photoUrls.length) return '';

  // Use up to 3 photos to control cost; Vision works best with primary hero shots
  const urlsToAnalyze = photoUrls.slice(0, 3);

  const imageContent = urlsToAnalyze.map(url => ({
    type: 'image_url',
    image_url: { url, detail: 'low' }, // 'low' = ~$0.001/image, sufficient for feature detection
  }));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
            text: `You are a careful, conservative photo describer for real estate listings.

Rules:
- ONLY describe details you can see with high confidence. If you are not certain, omit it.
- Do NOT infer countertops, flooring materials, room count, layout, open floor plan, great room, or “quality tier” unless clearly visible.
- Do NOT use real estate sales language; output observational notes only.
- Never invent features (fireplace, built-ins, coffered ceilings, shiplap, etc.) unless unmistakably visible.

Return TWO lines only:
1) CONFIDENT: <comma-separated fragments, max 20 items>
2) DO_NOT_INFER: <comma-separated list of things you deliberately avoided inferring>
Keep it short and factual.`,
            },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 260,
      temperature: 0.0,
    }),
  });

  if (!response.ok) {
    console.error('Vision API error:', response.status);
    return '';
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// ─── Scoring: authenticity and confidence ───────────────────────────────────
function scoreAuthenticity(
  copyText: string,
  neighborhood: string,
  vocab: string[],
  hasPhotos: boolean,
  hasLandmarkDistances: boolean,
  amenitiesCorpus: string,
): { authenticity: number; confidence: number } {
  let authenticity = 60; // base score
  let confidence = 55;

  // +vocab usage: reward for using neighborhood-specific terms
  const lowerCopy = copyText.toLowerCase();
  const corpus = (amenitiesCorpus || '').toLowerCase();
  const vocabHits = vocab.filter(v => lowerCopy.includes(v.toLowerCase())).length;
  authenticity += Math.min(vocabHits * 4, 24); // up to +24

  // Piazza: reward only when amenity/photo corpus supports porch/piazza language
  if (lowerCopy.includes('piazza')) {
    if (corpus.includes('piazza') || corpus.includes('porch') || corpus.includes('screened')) {
      authenticity += 4;
    } else {
      authenticity -= 12;
      confidence -= 6;
    }
  }

  // +specific Charleston place references
  const placeRefs = ['king street', 'shem creek', "sullivan's island", 'folly beach',
    'ravenel bridge', 'angel oak', 'magnolia plantation', 'battery', 'rainbow row',
    'waterfront park', 'daniel island', 'wild dunes', 'bohicket'];
  const placeHits = placeRefs.filter(p => lowerCopy.includes(p)).length;
  authenticity += Math.min(placeHits * 3, 9);

  // +confidence factors
  if (hasPhotos) confidence += 15;              // Visual context grounding
  if (hasLandmarkDistances) confidence += 10;   // Geographic precision
  if (neighborhood && NEIGHBORHOOD_VOCAB[neighborhood]) confidence += 10; // Known neighborhood
  if (vocabHits >= 3) confidence += 10;         // Vocabulary coherence

  // Purple-prose / AI-voice penalty
  const purple = ['warm embrace', 'like a warm embrace', 'enchanting', 'beckons', 'swept away', 'oasis', 'hidden gem', 'dream home'];
  const purpleHits = purple.filter(p => lowerCopy.includes(p)).length;
  authenticity -= Math.min(purpleHits * 4, 20);
  confidence -= Math.min(purpleHits * 2, 10);

  // Avoid generic terms penalty
  const genericTerms = ['beautiful home', 'must see', 'move-in ready', 'great location', 'stunning property', 'turn-key', 'turnkey'];
  const genericHits = genericTerms.filter(t => lowerCopy.includes(t)).length;
  authenticity -= genericHits * 3;
  confidence   -= genericHits * 2;

  return {
    authenticity: Math.min(100, Math.max(40, Math.round(authenticity))),
    confidence:   Math.min(100, Math.max(40, Math.round(confidence))),
  };
}

// Strip trailing [Word count: XXX] line from MLS copy before storing
function stripWordCountLine(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\s*\[Word count:\s*\d+\]\s*$/i, '').trim();
}

// Lightweight check: does copy contain bed/bath numbers that contradict payload?
function hasBedBathContradiction(
  copy: string,
  payloadBeds: string | number | null,
  payloadBaths: string | number | null
): boolean {
  if (!copy) return false;
  const beds = payloadBeds != null ? Number(payloadBeds) : null;
  const baths = payloadBaths != null ? Number(payloadBaths) : null;
  if (beds == null && baths == null) return false;
  const lower = copy.toLowerCase();
  // Look for "X bedroom(s)" or "X bed" where X != payload
  if (beds != null && !isNaN(beds)) {
    const bedMatch = lower.match(/(\d+)\s*[-]?\s*bed(?:room)?s?/);
    if (bedMatch && parseInt(bedMatch[1], 10) !== Math.round(beds)) return true;
  }
  if (baths != null && !isNaN(baths)) {
    const bathMatch = lower.match(/(\d+(?:\.\d+)?)\s*[-]?\s*bath(?:room)?s?/);
    if (bathMatch) {
      const mentioned = parseFloat(bathMatch[1]);
      const expected = Math.round(baths * 2) / 2; // 2.5 stays 2.5
      if (Math.abs(mentioned - expected) > 0.25) return true;
    }
  }
  return false;
}

// Refinement: second GPT call to improve flow and voice without adding facts
async function refineMlsCopy(draftMls: string, openAiKey: string): Promise<string> {
  const stripped = stripWordCountLine(draftMls);
  if (!stripped) return draftMls;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert editor for Charleston, SC real estate listings. Tighten flow, remove repetition, and dial back purple prose. Do NOT add or invent any facts, finishes, room counts, layout claims, or distances not already present in the draft. If a sentence implies an unlisted feature, delete or neutralize it. Target ~380–430 words. Return only the rewritten MLS description, no preamble or word count.',
        },
        {
          role: 'user',
          content: `Rewrite this MLS description for MLS-ready tone. Remove stacked metaphors and clichés ("embrace","enchanting","beckons","oasis") unless they are extremely mild and singular. Do not add or invent any facts.\n\n---\n\n${stripped}`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.35,
    }),
  });
  if (!res.ok) return draftMls;
  const data = await res.json();
  const refined = data.choices?.[0]?.message?.content?.trim();
  return refined && refined.length > 100 ? refined : draftMls;
}

// Third pass: strip hallucinated facts not in input (cheap gpt-4o-mini)
async function factCheckMls(
  mls: string,
  factsJson: string,
  openAiKey: string,
): Promise<string> {
  if (!mls || mls.length < 80) return mls;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Review the MLS description. Remove any factual claims about THIS property that are NOT supported by the INPUT FACTS JSON (beds, baths, sqft, price, amenities list, vision text, landmarks). Aggressively remove or neutralize: flooring materials, window-wall / "expansive windows" / natural light claims, open-concept layout, chef kitchen, marsh/water views, primary/master suite spa framing, and yard/fence/school claims unless explicitly in the JSON. Preserve MLS flow and ~380–430 words when possible. Return ONLY the cleaned MLS description, no preamble.',
        },
        {
          role: 'user',
          content: `INPUT FACTS (JSON):\n${factsJson}\n\n---\n\nMLS DESCRIPTION:\n${mls}\n\n---\n\nReturn the cleaned description only.`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.15,
    }),
  });
  if (!res.ok) return mls;
  const data = await res.json();
  const cleaned = data.choices?.[0]?.message?.content?.trim();
  return cleaned && cleaned.length > 120 ? cleaned : mls;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Track generationId so we can safely mark failures in the catch block
  let generationId: string | undefined;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    generationId = payload.generationId;
    const {
      address, neighborhood, propertyType,
      bedrooms, bathrooms, sqft, price, amenities, customAmenities,
      tone, generateMLS, generateAirbnb, generateSocial,
      photoUrls = [],
      neighborhoodContext = null,   // keywords_for_ai from charleston_neighborhoods.json
      neighborhoodLifestyle = [],   // lifestyle phrases array
      overviewOnly = false,
    } = payload;

    const openAiKey = Deno.env.get('OPENAI_API_KEY')!;

    // ─── Step 1: Vision photo analysis (parallel with geocode) ──────────
    const [visionSummary, geocodeData] = await Promise.all([
      photoUrls.length > 0
        ? analyzePhotosWithVision(photoUrls, openAiKey)
        : Promise.resolve(''),
      fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${Deno.env.get('GOOGLE_MAPS_SERVER_KEY')}`
      ).then(r => r.json()).catch(() => null),
    ]);

    // ─── Step 2: Landmark distances ──────────────────────────────────────
    let landmarkDistances: Record<string, string> = {};
    const origin = geocodeData?.results?.[0]?.geometry?.location;

    if (origin) {
      const destinations = Object.values(LANDMARKS)
        .map(l => `${l.lat},${l.lng}`)
        .join('|');
      const dmRes = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destinations}&units=imperial&key=${Deno.env.get('GOOGLE_MAPS_SERVER_KEY')}`
      );
      const dmData = await dmRes.json();
      const elements = dmData.rows?.[0]?.elements ?? [];
      Object.keys(LANDMARKS).forEach((name, i) => {
        const el = elements[i];
        if (el?.status === 'OK') landmarkDistances[name] = el.distance.text;
      });
    }

    // ─── Step 3: Build neighborhood context ──────────────────────────────
    const vocab = NEIGHBORHOOD_VOCAB[neighborhood] ?? ['Lowcountry', 'piazza', 'live oaks', 'tidal creek'];
    const customList = (customAmenities ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const allAmenities = [...(amenities ?? []), ...customList];

    // Build closest landmark string for prompt injection
    const nearbyLandmarks = Object.entries(landmarkDistances)
      .sort(([,a],[,b]) => parseFloat(a) - parseFloat(b))
      .slice(0, 3)
      .map(([name, dist]) => `${name} (${dist})`)
      .join(', ');

    // ─── Step 4: GPT-4o-mini listing generation ───────────────────────────
    const lifestyleHints = (neighborhoodLifestyle as string[]).slice(0, 4).join('; ');
    const neighborhoodName = neighborhood ?? 'Charleston';

    const FACT_ONLY_RULES = `TEXT-ONLY FACT LOCK:
Every structural, finish, layout, storage, view, or exterior claim MUST appear verbatim (or as an unambiguous synonym listed below) in: (a) the amenities/custom list, (b) Photo-derived CONFIDENT line, or (c) landmark distance names/strings.

FORBIDDEN unless explicitly supported above:
- Flooring types or materials (hardwood, LVP, tile, marble, "rich wood", "heart pine", etc.).
- Ceiling types (vaulted, tray, coffered, soaring) and "abundant / generous natural light" or "expansive / floor-to-ceiling windows".
- Open floor plan / open concept / great-room flow unless explicitly in amenities or CONFIDENT photo line.
- Chef's / gourmet kitchen unless "Chef's Kitchen" or equivalent is listed or clearly visible in CONFIDENT photo line.
- Fireplaces, pools, docks, marsh/water/ocean "views" from this home, fenced yard, mudroom, built-ins, shiplap, coffered ceilings, primary/master "suite" as luxury spa framing, or any room not evidenced.

If a detail is missing, omit it—write a shorter MLS rather than padding with invented tours.

Atmosphere (breeze, neighborhood rhythm, Holy City lifestyle) is allowed ONLY when it does not assert an unlisted physical feature of THIS home.

Use the word "piazza" only if "Screened Piazza", "Wraparound Porch", or similar appears in amenities OR CONFIDENT photo line mentions porch/piazza. Otherwise say "porch" only if supported, else omit.`;

    let systemPrompt: string;
    let userPrompt: string;

    if (overviewOnly && generateMLS) {
      systemPrompt = `You are a Charleston metro real estate writer. Produce a NEIGHBORHOOD / AREA overview only—clear, factual, and readable. Never describe a specific home's interior, bed/bath count, or features unless Photo-derived CONFIDENT line explicitly describes visible exterior. No invented property specifics.
Avoid purple prose and these phrases entirely: "warm embrace", "enchanting", "beckons", "swept away", "dream home", "hidden gem", "oasis".`;
      userPrompt = `QUICK OVERVIEW MODE — no full property specs provided.
${LANDMARK_USE_RULES}
Vicinity address: ${address}
Neighborhood: ${neighborhood ?? 'Charleston metro'}
Property type label (for context only, do not invent a listing): ${propertyType}
Verified distances from this address: ${nearbyLandmarks || '(none—describe area character without inventing mileage)'}
${neighborhoodContext ? `Area guide: ${neighborhoodContext}` : ''}
${visionSummary ? `Photo note (exterior/curb only if visible): ${visionSummary}` : ''}

${generateMLS ? `MLS_DESCRIPTION: 180–260 words. Describe why buyers value this area—dining, beaches, schools vibe, commute, Lowcountry character (tidal creeks, marsh context as regional flavor, not "this home has marsh frontage" unless photos prove it). Do NOT state bedroom count, bathroom count, square footage, or interior features. End with this exact sentence on its own line: "Add more details for a full property-specific listing—include bedrooms, bathrooms, square footage, and amenities on your next generation."` : ''}
${generateAirbnb ? 'AIRBNB_COPY: 120–180 words as a neighborhood / area guest guide only—no specific home claims—or null if inappropriate.' : ''}
${generateSocial ? 'SOCIAL: 3 short posts about the area/hyperlocal vibe, max 200 chars each + hashtags.' : ''}

improvement_suggestions: first MUST be exactly: "Add more details for full listing? Enter bedrooms, bathrooms, square footage, and amenities on a new generation for property-specific MLS copy." Second: one other actionable tip.

Respond ONLY with valid JSON: { "mls_copy", "airbnb_copy", "social_captions", "improvement_suggestions" }. Null unused fields.`;
    } else {
      systemPrompt = `You are a top ${neighborhoodName} agent writing MLS descriptions that are accurate first, engaging second.
${FACT_ONLY_RULES}
${VOICE_DISCIPLINE}
${LANDMARK_USE_RULES}
Neighborhood vocabulary (do not attribute these features to the home unless in facts/photos): ${vocab.join(', ')}.
${neighborhoodContext ? `Neighborhood guide (area flavor only): ${neighborhoodContext}` : ''}
${lifestyleHints ? `Lifestyle hints (do not fabricate property features from these): ${lifestyleHints}` : ''}
${mlsToneGuidance(typeof tone === 'string' ? tone : undefined)}
Never use generic clichés ("must see", "stunning", "move-in ready", "won't last long", "turn-key").
${generateMLS ? MLS_STYLE_ANCHORS : ''}`;

      const authorizedFacts = `AUTHORIZED FACTS — text-only; every structural/feature claim in MLS must be traceable to this list or photo-derived line:
Address: ${address}
Neighborhood: ${neighborhood ?? 'Charleston, SC'}
Property type: ${propertyType}
Bedrooms: ${bedrooms ?? 'not specified'} | Bathrooms: ${bathrooms ?? 'not specified'} | Sqft: ${sqft ?? 'not specified'} | Price: ${price ? `$${Number(price).toLocaleString()}` : 'not specified'}
Amenities / features you MAY mention by name: ${allAmenities.length ? allAmenities.join(', ') : 'none listed—do not invent features'}
Landmark distances (use these exact distances only): ${nearbyLandmarks || 'none'}
${visionSummary ? `Photo-derived details (ONLY other source for finishes/layout/features): ${visionSummary}` : 'No photo analysis—do not describe interior finishes, rooms, or exterior features not in amenities.'}
Voice may be warm only in non-factual sentences; do not add property facts beyond this block.`;

      const mlsInstructions = generateMLS ? `
${MLS_OUTLINE_RULES}
${LANDMARK_USE_RULES}
${VOICE_DISCIPLINE}` : '';

      userPrompt = `${authorizedFacts}

${generateMLS ? mlsInstructions : ''}
${generateAirbnb ? 'Generate AIRBNB_COPY: 200-250 words; only claim features from AUTHORIZED FACTS and photo-derived details.' : ''}
${generateSocial ? 'Generate SOCIAL_1, SOCIAL_2, SOCIAL_3: max 200 chars + hashtags; facts from listing only.' : ''}

Respond ONLY with valid JSON in this exact shape:
{
  "mls_copy": "...",
  "airbnb_copy": "...",
  "social_captions": ["...", "...", "..."],
  "improvement_suggestions": ["specific suggestion 1", "specific suggestion 2"]
}
For unused sections return null (not empty string). improvement_suggestions must be 2 actionable, specific tips.`;
    }

    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2500,
        temperature: 0.5,
      }),
    });

    if (!openAiRes.ok) {
      const errText = await openAiRes.text();
      throw new Error(`OpenAI error ${openAiRes.status}: ${errText}`);
    }

    const openAiData = await openAiRes.json();
    const generated  = JSON.parse(openAiData.choices[0].message.content);

    // ─── Step 4b: Refinement + fact-check (full listing only) ────────────
    let finalMlsCopy: string | null = generated.mls_copy ?? null;
    if (finalMlsCopy) {
      const draftMls = stripWordCountLine(finalMlsCopy);
      if (overviewOnly) {
        finalMlsCopy = draftMls;
      } else {
        let refined: string;
        try {
          refined = await refineMlsCopy(finalMlsCopy, openAiKey);
        } catch (_) {
          refined = draftMls;
        }
        refined = stripWordCountLine(refined);
        if (hasBedBathContradiction(refined, bedrooms, bathrooms)) {
          finalMlsCopy = draftMls;
        } else {
          finalMlsCopy = refined || draftMls;
        }
        finalMlsCopy = stripWordCountLine(finalMlsCopy) || finalMlsCopy;
        const factsJson = JSON.stringify({
          bedrooms,
          bathrooms,
          sqft,
          price,
          amenities: allAmenities,
          visionSummary: visionSummary || null,
          landmarks: nearbyLandmarks,
          neighborhood,
          propertyType,
        });
        try {
          finalMlsCopy = await factCheckMls(finalMlsCopy, factsJson, openAiKey);
        } catch (_) { /* keep previous */ }
        finalMlsCopy = stripWordCountLine(finalMlsCopy) || finalMlsCopy;
      }
    }

    // ─── Step 5: Score authenticity + confidence ─────────────────────────
    const allGeneratedCopy = [
      finalMlsCopy ?? '',
      generated.airbnb_copy ?? '',
      ...(generated.social_captions ?? []),
    ].join(' ');

    const amenitiesCorpus = `${allAmenities.join(', ')} ${visionSummary || ''}`;

    const scores = scoreAuthenticity(
      allGeneratedCopy,
      neighborhood,
      vocab,
      photoUrls.length > 0,
      Object.keys(landmarkDistances).length > 0,
      amenitiesCorpus,
    );

    // ─── Step 6: Update generation row ───────────────────────────────────
    const { error: updateErr } = await supabase.from('generations').update({
      mls_copy:                finalMlsCopy,
      airbnb_copy:             generated.airbnb_copy ?? null,
      social_captions:         generated.social_captions ?? null,
      authenticity_score:      scores.authenticity,
      confidence_score:        scores.confidence,
      improvement_suggestions: generated.improvement_suggestions ?? null,
      landmark_distances:      landmarkDistances,
      photo_urls:              photoUrls,
      status:                  'complete',
    }).eq('id', generationId);

    if (updateErr) throw updateErr;

    // In test mode, do not consume generation quota.
    const allowTest = await isAllowedTestGeneration(supabase, generationId);
    if (!allowTest) {
      await supabase.rpc('increment_generation_count', { p_generation_id: generationId });
    }

    return new Response(JSON.stringify({ ok: true, scores }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  } catch (err: unknown) {
    console.error('generate-listing error:', err);
    const msg = (err as Error)?.message ?? String(err);

    if (generationId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await supabase
          .from('generations')
          .update({
            status: 'error',
            error_message: msg.slice(0, 500),
          })
          .eq('id', generationId);
      } catch {
        // swallow secondary failure; original error still returned
      }
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
