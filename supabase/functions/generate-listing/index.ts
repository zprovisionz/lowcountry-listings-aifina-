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
import { analyzeImagesWithVision, generateCompletion } from '../_shared/ai-client.ts';
import { getCachedDistances, setCachedDistances, sha256Hex } from '../_shared/distance-cache.ts';

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

// Few-shot MLS voice examples — 5 neighborhood "voice signatures."
// Use for sentence rhythm, cadence, and emotional palette ONLY. Never copy facts.
const MLS_FEW_SHOT_EXAMPLES = `

=== FEW-SHOT VOICE SIGNATURES (rhythm and emotion ONLY — copy NO facts) ===
Match the voice signature of the neighborhood below. If the subject property's neighborhood is not shown, blend the closest match with the neighborhood's keywords_for_ai guide.
CRITICAL: Do NOT copy piazza, live oaks, fireplace, chef kitchen, marsh views, layout, or any specific feature from these examples unless that exact feature is present in AUTHORIZED FACTS or Photo-derived details for the subject property.

[Mount Pleasant — marsh / live oaks / Shem Creek rhythm]
"The first time you turn onto the street, you feel it: the canopy of live oaks, the quiet hum of a neighborhood that still knows its neighbors. This Mount Pleasant home doesn't announce itself with flash — it invites you in with a wide, shaded piazza where the coastal breeze moves through the screens and the only soundtrack is the rustle of palmetto fronds. Evenings begin with sweet tea at golden hour and end with the glow of Shem Creek sunsets a short drive away. Pluff mud on the breeze, blue herons over the marsh, Sullivan's just across the bridge — unmistakably home."

[Downtown Charleston — antebellum / cobblestone / King Street walkability]
"Step onto cobblestone and time slows. This Charleston single rises behind a hand-forged iron gate, its double piazza painted Charleston green, gas lanterns flickering against weathered stucco. Inside, heart-pine floors creak softly underfoot and tall transom windows draw the late-afternoon light across the foyer. Walk out the front door and King Street's boutiques and dining rooms are yours; turn the other way and the Battery's seawall waits a few blocks south. Horse-drawn carriages clop past at dusk. This is the Holy City in its most original key — antebellum bones, contemporary soul, and an address that quietly carries weight."

[Folly Beach — Edge of America / surf / bohemian rental rhythm]
"They call this the Edge of America for a reason. Out here, your day starts with the saltwater wind off the Atlantic and an unhurried walk to the surf break, board tucked under one arm. The cottage sits a short pedal from Center Street, where weathered storefronts hide some of the best fish tacos in the Lowcountry and a porch beer with strangers feels like tradition. Behind the house, the tidal creek runs out toward the Morris Island Lighthouse, watercolor pink at sunset. This is more than a beach house — it's a bohemian rhythm, a vacation-rental engine, and the freedom of saltwater days."

[Daniel Island — master-planned / riverwalk / Town Center new urbanism]
"Daniel Island isn't a neighborhood so much as a lifestyle that's been thoughtfully composed. The riverwalk threads along the Wando, where deepwater docks meet championship golf at the Daniel Island Club. Mornings start with coffee on the Town Center plaza, afternoons lean into tennis or a kayak launch from Smythe Park, and evenings settle in over wood-fired dinners three blocks from your front door. Architecture nods to the best of new urbanism — wide front porches, walkable blocks, mature trees already filling out. For buyers who want resort-grade amenities without leaving home, Daniel Island delivers a rare, tightly-knit Lowcountry experience."

[Summerville — Flowertown / azaleas / Nexton vs historic downtown / family]
"Flowertown lives up to its name. Drive into Summerville under canopies of pines and live oaks, past Azalea Park in March bloom, and the historic downtown unfolds in front-porch storefronts that have anchored this town for generations. Out toward Nexton, the rhythm shifts: tree-lined avenues open to walkable squares of cafés and shops, the kind of master-planned ease families settle into for years. Dorchester D2 schools are the quiet anchor; the Sawmill Branch Trail is where the weekend begins. Lowcountry living with a slower pulse — where neighbors wave from the porch swing and azaleas still mean spring."
`;

// Tone-specific prompt modifiers (replaces the single "Tone requested: X" line).
// Each modifier is multi-sentence and pushes the model toward a meaningfully
// different cadence, vocabulary, and emotional register.
function getToneModifier(tone: string | undefined | null): string {
  switch ((tone ?? 'standard').toLowerCase()) {
    case 'luxury':
      return `Adopt an elevated, refined voice with restrained adjectives and rhythmic, slightly longer sentences. Emphasize craftsmanship, provenance, materials, and lifestyle — the texture of heart-pine underfoot, the choreography of light through a transom window, the heft of an iron gate. Suggest exclusivity through cadence and specificity rather than the words "luxury" or "exclusive." Never use "must-see," "stunning," or "won't last." Trust the reader; show, do not announce. Buyers at this tier read carefully — reward them with precision, not superlatives.`;
    case 'family':
      return `Write for buyers picturing their family in this home. Highlight neighborhood feel, walkability to schools and parks (only if supported by AUTHORIZED FACTS or landmarks), room for everyday life, and the weekend rhythms a young family would love — porch evenings, bike rides, neighbors who wave from the mailbox. Tone is warm, reassuring, and grounded, never saccharine. Lean into front-porch culture and community character in the Lowcountry vein. Avoid sales urgency; lean into belonging and the feeling of settling in for the long arc of family life.`;
    case 'investment':
      return `Write for a confident investor or short-term-rental operator. Lead with demand drivers: proximity to beaches, downtown, dining, and tourist anchors; rental-income potential where the area realistically supports it (Folly Beach, Isle of Palms, Downtown Charleston, Daniel Island). Note attributes that improve occupancy: privacy, parking, layout for groups, turnkey readiness — only when supported by facts. Tone is analytical but still emotive — guests stay because a place feels good, not just because the numbers work. Never invent cap rates, ADRs, or projected rental income. Keep the writing tight, confident, and specific.`;
    case 'standard':
    default:
      return `Adopt a balanced, modern Charleston-local agent voice — warm professionalism, clean cadence, and confident specificity without ever sounding flashy. Speak to a broad, well-informed buyer audience: someone who values authenticity, walkability, and the everyday rhythms of Lowcountry life. Emotional warmth is welcome; superlatives and sales clichés are not. Lean into the texture of daily life here rather than on luxury markers — unless luxury is clearly in the AUTHORIZED FACTS for this property.`;
  }
}

// ─── Vision: analyze property photos ────────────────────────────────────────
async function analyzePhotosWithVision(photoUrls: string[]): Promise<string> {
  if (!photoUrls.length) return '';
  const urlsToAnalyze = photoUrls.slice(0, 3);
  const prompt = `You are an expert Charleston real estate photographer's eye describing property photos for an MLS listing writer.

Be confident: describe what you actually see — materials, finishes, layout flow, light quality, architectural style, and condition. You do not need to hedge on details that are visually obvious (e.g. "hardwood floors," "white shaker cabinets," "coffered ceiling," "stainless appliances," "screened piazza"). Skip only details you genuinely cannot identify.

Specifically scan for Lowcountry / Charleston signature elements when present:
- Piazzas (single or double; screened or open) and wraparound porches
- Charleston green shutters, gas lanterns, hand-forged iron details
- Heart-pine or wide-plank hardwood floors, transom windows, shiplap, coffered or beadboard ceilings
- Charleston-single orientation (gable end to street, side piazza), raised foundations, metal roofs
- Brick, tabby, board-and-batten, or HardiePlank exteriors typical of the region
- Marsh / tidal creek / dock / boat-lift views, mature live oaks framing the lot
- Oyster-shell or crushed-tabby paths, courtyard gardens, palmetto landscaping

Output EXACTLY two lines, no preamble:
CONFIDENT: <comma-separated descriptive phrases, max 25 items>
LOWCOUNTRY_FEATURES: <comma-separated Charleston-specific architectural elements detected, or "none">`;

  return analyzeImagesWithVision(urlsToAnalyze, prompt);
}

// Pulls the LOWCOUNTRY_FEATURES line out of the Vision summary so we can promote
// it into the listing prompt as a confident, dedicated authenticity signal.
function parseLowcountryFeatures(visionSummary: string): string | null {
  if (!visionSummary) return null;
  const m = visionSummary.match(/^\s*LOWCOUNTRY_FEATURES\s*:\s*(.+)$/im);
  const raw = m?.[1]?.trim();
  if (!raw) return null;
  if (/^none\b/i.test(raw)) return null;
  return raw;
}

// ─── Scoring: authenticity and confidence ───────────────────────────────────
function scoreAuthenticity(
  copyText: string,
  neighborhood: string,
  vocab: string[],
  hasPhotos: boolean,
  hasLandmarkDistances: boolean,
): { authenticity: number; confidence: number } {
  let authenticity = 60; // base score
  let confidence = 55;

  // +vocab usage: reward for using neighborhood-specific terms
  const lowerCopy = copyText.toLowerCase();
  const vocabHits = vocab.filter(v => lowerCopy.includes(v.toLowerCase())).length;
  authenticity += Math.min(vocabHits * 4, 24); // up to +24

  // +piazza usage (core Charleston authenticity signal)
  if (lowerCopy.includes('piazza')) authenticity += 6;

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

  // Avoid generic terms penalty
  const genericTerms = ['beautiful home', 'must see', 'move-in ready', 'great location', 'stunning property'];
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

// Combined refine + fact-check in ONE call (replaces the previous two passes).
// Removes unsupported claims, improves flow & sensory detail, preserves/deepens
// neighborhood voice, targets 400–450 words, and expands arrival/lifestyle if <380.
async function refineAndFactCheckMls(
  draftMls: string,
  factsJson: string,
): Promise<string> {
  const stripped = stripWordCountLine(draftMls);
  if (!stripped || stripped.length < 80) return draftMls;
  try {
    const polished = await generateCompletion({
      messages: [
        {
          role: 'system',
          content:
            "You are an expert editor for Charleston, SC real estate listings. In a SINGLE pass, do all of the following: (1) remove any factual claim about the property that is not supported by the INPUT FACTS JSON or photo-derived details (beds, baths, sqft, amenities list, vision text including LOWCOUNTRY_FEATURES, landmark distances) — if the draft mentions piazza, fireplace, pool, dock, chef kitchen, live oaks on the lot, room layout, or finishes not in those facts, remove or generalize those sentences; (2) improve flow and add concrete sensory detail (sight, sound, scent, light, breeze); (3) preserve and deepen the neighborhood voice and emotional resonance — do not flatten the copy; (4) target 400–450 words; if the draft runs short of 380 words, expand the arrival and lifestyle/location sections (NOT the fact-bearing room descriptions). Return ONLY the final MLS description — no preamble, no word count, no commentary.",
        },
        {
          role: 'user',
          content: `INPUT FACTS (JSON):\n${factsJson}\n\n---\n\nDRAFT MLS DESCRIPTION:\n${stripped}\n\n---\n\nReturn the final, polished MLS description only.`,
        },
      ],
      maxTokens: 1400,
      temperature: 0.3,
    });
    return polished && polished.length > 120 ? polished : draftMls;
  } catch {
    return draftMls;
  }
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
      generateEmail = true,
      photoUrls = [],
      neighborhoodContext = null,   // keywords_for_ai from charleston_neighborhoods.json
      neighborhoodLifestyle = [],   // lifestyle phrases array
      overviewOnly = false,
      relistOf = null,
      relistNotes = null,
      relistPrice = null,
    } = payload;

    const isRelist = !!relistOf;
    const sanitizedRelistNotes = typeof relistNotes === 'string' ? relistNotes.trim().slice(0, 600) : '';

    // ─── Step 1: Vision photo analysis (parallel with geocode) ──────────
    const [visionSummary, geocodeData] = await Promise.all([
      photoUrls.length > 0
        ? analyzePhotosWithVision(photoUrls)
        : Promise.resolve(''),
      fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${Deno.env.get('GOOGLE_MAPS_SERVER_KEY')}`
      ).then(r => r.json()).catch(() => null),
    ]);

    // ─── Step 2: Landmark distances (90-day cache by normalized address hash) ─
    let landmarkDistances: Record<string, string> = {};
    const origin = geocodeData?.results?.[0]?.geometry?.location;

    if (origin) {
      const addressHash = await sha256Hex(String(address));
      const cached = await getCachedDistances(addressHash);
      if (cached && Object.keys(cached).length > 0) {
        landmarkDistances = cached;
      } else {
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
        if (Object.keys(landmarkDistances).length > 0) {
          await setCachedDistances(addressHash, String(address).trim(), landmarkDistances);
        }
      }
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

    // ─── Step 4: Listing generation (Claude primary, OpenAI fallback) ─────
    const lifestyleHints = (neighborhoodLifestyle as string[]).slice(0, 4).join('; ');
    const neighborhoodName = neighborhood ?? 'Charleston';

    const FACT_ONLY_RULES = `TEXT-ONLY FACT LOCK:
Use ONLY factual details explicitly provided below (beds, baths, sqft, price, amenities list, photo-derived text, landmark distances). Do NOT add or assume: fireplaces, piazzas, pools, docks, chef kitchens, live oaks on this lot, fenced yard, primary suite layout, mudroom, or any finish or room not in that list. If a detail is missing, omit it gracefully—do not invent.
Atmospheric storytelling is encouraged (breeze, light, neighborhood feel, Holy City lifestyle) as long as you do not claim a specific unlisted physical feature.
Use the word "piazza" only if "Screened Piazza" or "Wraparound Porch" or similar appears in amenities OR photo analysis mentions porch/piazza. Otherwise use neutral terms like "entry" or omit.`;

    let systemPrompt: string;
    let userPrompt: string;

    if (overviewOnly && generateMLS) {
      systemPrompt = `You are a Charleston metro real estate writer. Produce a NEIGHBORHOOD / AREA overview only—elegant, immersive, factual about the area. Never describe a specific home's interior, bed/bath count, or features unless Photo-derived details explicitly describe visible exterior from uploaded images. No invented property specifics.`;
      userPrompt = `QUICK OVERVIEW MODE — no full property specs provided.
Vicinity address: ${address}
Neighborhood: ${neighborhood ?? 'Charleston metro'}
Property type label (for context only, do not invent a listing): ${propertyType}
Verified distances from this address: ${nearbyLandmarks || '(none—describe area character without inventing mileage)'}
${neighborhoodContext ? `Area guide: ${neighborhoodContext}` : ''}
${visionSummary ? `Photo note (exterior/curb only if visible): ${visionSummary}` : ''}

${generateMLS ? `MLS_DESCRIPTION: 180–260 words. Describe why buyers value this area—dining, beaches, schools vibe, commute, Lowcountry character (tidal creeks, marsh context as regional flavor, not "this home has marsh frontage" unless photos prove it). Do NOT state bedroom count, bathroom count, square footage, or interior features. End with this exact sentence on its own line: "Add more details for a full property-specific listing—include bedrooms, bathrooms, square footage, and amenities on your next generation."` : ''}
${generateAirbnb ? 'AIRBNB_COPY: 120–180 words as a neighborhood / area guest guide only—no specific home claims—or null if inappropriate.' : ''}
${generateSocial ? 'SOCIAL: 3 short posts about the area/hyperlocal vibe, max 200 chars each + hashtags.' : ''}
${generateEmail ? 'EMAIL_COPY: 150–200 words. Write as a Charleston agent sending a tasteful buyer-list email about this area / opportunity—warm, professional, no false property specs; invite replies and showings without inventing bed/bath/sqft.' : ''}

improvement_suggestions: first MUST be exactly: "Add more details for full listing? Enter bedrooms, bathrooms, square footage, and amenities on a new generation for property-specific MLS copy." Second: one other actionable tip.

Respond ONLY with valid JSON: { "mls_copy", "airbnb_copy", "social_captions"${generateEmail ? ', "email_copy"' : ''}, "improvement_suggestions" }. Null unused fields.`;
    } else {
      const toneModifier = getToneModifier(tone);
      const lowcountryFeatures = parseLowcountryFeatures(visionSummary);

      const mandatoryNeighborhoodBlock = neighborhoodContext
        ? `=== MANDATORY NEIGHBORHOOD VOICE (${neighborhoodName}) ===
${neighborhoodContext}
You MUST incorporate at least 3 vocabulary terms from this guide naturally into the copy.
Lifestyle selling points to reference (pick 2-3): ${lifestyleHints || '(none provided — use the guide above to infer them)'}
===`
        : `=== MANDATORY NEIGHBORHOOD VOICE (${neighborhoodName}) ===
You MUST incorporate at least 3 of the following Lowcountry vocabulary terms naturally into the copy: ${vocab.join(', ')}.
Lifestyle selling points to reference (pick 2-3): ${lifestyleHints || '(none provided)'}
===`;

      systemPrompt = `=== ROLE ===
You are a top-producing ${neighborhoodName} real estate agent with 15+ years of experience writing MLS listings for Charleston, SC. You write the way the best Charleston agents speak — elegant, human, immersive, and unmistakably local. Never robotic, never list-like, never generic.

=== VOICE RULES ===
- Write in flowing prose with varied sentence rhythm. No bullet lists in the MLS body.
- Every paragraph must contain at least one concrete sensory detail (sight, sound, scent, light, breeze, touch, or taste). Atmosphere is not optional.
- Use the Lowcountry vocabulary palette where it does not falsely attribute a feature to this property: ${vocab.join(', ')}.
- Never use generic real estate clichés: "must see," "stunning," "move-in ready," "won't last long," "luxury living at its finest," "your dream home awaits," "priced to sell," "rare opportunity."
- Show, don't announce. Let cadence and specificity do the work of "luxury" or "charming."

=== FACT RULES ===
${FACT_ONLY_RULES}
- PIAZZA GUARDRAIL: Use the word "piazza" ONLY if "Screened Piazza," "Wraparound Porch," or a similar porch amenity appears in the amenities list, OR the photo analysis explicitly mentions a porch or piazza. Otherwise use neutral terms like "entry," "front steps," or omit the feature entirely. This guardrail is non-negotiable.
- Never invent or assume factual claims beyond the AUTHORIZED FACTS block. Atmospheric storytelling is encouraged (breeze, light, neighborhood rhythm, Holy City lifestyle) as long as you do not claim a specific unlisted physical feature on this property.

=== TONE (${(tone ?? 'standard').toString().toUpperCase()}) ===
${toneModifier}

=== STRUCTURE (MLS, 400–450 words total) ===
Write the MLS in four cleanly flowing paragraphs, in this order and at these word budgets:
1. ARRIVAL (60–80 words): The approach — street, light, neighborhood feel, the moment of pulling up. No false claims about this home's exterior unless in AUTHORIZED FACTS or photos.
2. INTERIOR FLOW (150–180 words): Move through the home using only beds/baths/sqft, the amenities list, and photo-derived details. Describe rhythm, light, and flow between spaces — never invent additional rooms, finishes, or layouts.
3. OUTDOOR + LOCATION (80–100 words): Exterior (only if in facts/photos), landmark distances from the verified list, and area lifestyle that ties the home to its neighborhood.
4. CLOSE (40–60 words): A confident, human invitation to schedule a private tour. No clichés.

Each paragraph must include at least one concrete sensory detail. If the writing risks going generic, anchor it in something specific you can actually see, smell, or hear in the AUTHORIZED FACTS / photo analysis.

${mandatoryNeighborhoodBlock}

${generateMLS ? MLS_FEW_SHOT_EXAMPLES : ''}`;

      const authorizedFacts = `AUTHORIZED FACTS — text-only; every structural/feature claim in MLS must be traceable to this list or photo-derived line:
Address: ${address}
Neighborhood: ${neighborhood ?? 'Charleston, SC'}
Property type: ${propertyType}
Bedrooms: ${bedrooms ?? 'not specified'} | Bathrooms: ${bathrooms ?? 'not specified'} | Sqft: ${sqft ?? 'not specified'} | Price: ${price ? `$${Number(price).toLocaleString()}` : 'not specified'}
Amenities / features you MAY mention by name: ${allAmenities.length ? allAmenities.join(', ') : 'none listed—do not invent features'}
Landmark distances (use these exact distances only): ${nearbyLandmarks || 'none'}
${visionSummary ? `Photo-derived details (ONLY other source for finishes/layout/features): ${visionSummary}` : 'No photo analysis—do not describe interior finishes, rooms, or exterior features not in amenities.'}
${lowcountryFeatures ? `Charleston-specific photo features detected (use these CONFIDENTLY in the copy — they are visible in the photos): ${lowcountryFeatures}` : ''}
You have full creative freedom on voice, mood, and non-specific atmosphere. Do not add facts.`;

      const mlsInstructions = generateMLS ? `
Generate MLS_DESCRIPTION following the STRUCTURE section in the system prompt (ARRIVAL 60–80 / INTERIOR FLOW 150–180 / OUTDOOR+LOCATION 80–100 / CLOSE 40–60; total 400–450 words). End with this exact line on its own row: [Word count: XXX]` : '';

      const airbnbInstructions = generateAirbnb ? `
Generate AIRBNB_COPY (200–250 words). Write as a Charleston Superhost messaging a friend who's about to visit — warm, specific, generous with insider detail. Lead with what makes this stay special for a visitor (not the listing-agent angle). Highlight walkability, the beach/dining/day-trip options nearby, and the rhythm of a Charleston weekend a guest would actually want. Use "you" and "your" generously — make them feel personally hosted. Only claim features from AUTHORIZED FACTS, LOWCOUNTRY_FEATURES, and photo-derived details. End with 3–4 short practical amenity bullets covering: WiFi, parking, kitchen, and check-in (mark each with "•" at the start of the line; brief one-liner each). Bullets are the only place lists are allowed.` : '';

      userPrompt = `${authorizedFacts}

${generateMLS ? mlsInstructions : ''}
${airbnbInstructions}
${generateSocial ? 'Generate SOCIAL_1, SOCIAL_2, SOCIAL_3: max 200 chars + hashtags; facts from listing only.' : ''}
${generateEmail ? `Generate EMAIL_COPY: 150–200 words as a single email body to your buyer list / sphere. Subject line not required. Agent voice: warm, confident, Charleston-local. Use only AUTHORIZED FACTS and photo-derived details—no invented features. Include a clear soft CTA (reply, questions, schedule a tour). Plain paragraphs; no heavy HTML.` : ''}

Respond ONLY with valid JSON in this exact shape:
{
  "mls_copy": "...",
  "airbnb_copy": "...",
  "social_captions": ["...", "...", "..."]${generateEmail ? ',\n  "email_copy": "..."' : ''},
  "improvement_suggestions": ["specific suggestion 1", "specific suggestion 2"]
}
For unused sections return null (not empty string). improvement_suggestions must be 2 actionable, specific tips.`;
    }

    if (isRelist) {
      const toneLabel = String(tone ?? 'standard');
      const notesLine = sanitizedRelistNotes
        ? `Notes from agent: ${sanitizedRelistNotes}`
        : 'Notes from agent: (none — keep momentum, acknowledge return, do not invent context.)';
      const priceLine = relistPrice
        ? `New list price: $${Number(relistPrice).toLocaleString()}.`
        : '';
      systemPrompt += `

=== RELIST MODE ===
This is a RELIST. Acknowledge the property is back on the market with fresh momentum. Tone shift: ${toneLabel}. ${notesLine} ${priceLine} Do not call out that it was previously listed in negative terms; lean into renewed energy and the opportunity for the next buyer.`;
    }

    const generatedJson = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
      maxTokens: 2500,
      temperature: 0.55,
    });

    type GenPayload = {
      mls_copy?: string | null;
      airbnb_copy?: string | null;
      social_captions?: string[] | null;
      email_copy?: string | null;
      improvement_suggestions?: string[] | null;
    };
    let generated: GenPayload;
    try {
      generated = JSON.parse(generatedJson) as GenPayload;
    } catch {
      throw new Error('Model returned invalid JSON');
    }

    // ─── Step 4b: Combined refine + fact-check in a single call (full listing only) ─
    // Pipeline: Call 1 = generate (above). Call 2 = combined refine + fact-check.
    let finalMlsCopy: string | null = generated.mls_copy ?? null;
    if (finalMlsCopy) {
      const draftMls = stripWordCountLine(finalMlsCopy);
      if (overviewOnly) {
        finalMlsCopy = draftMls;
      } else {
        const factsJson = JSON.stringify({
          bedrooms,
          bathrooms,
          sqft,
          price,
          amenities: allAmenities,
          visionSummary: visionSummary || null,
          lowcountryFeatures: parseLowcountryFeatures(visionSummary),
          landmarks: nearbyLandmarks,
          neighborhood,
          propertyType,
        });
        let polished: string;
        try {
          polished = await refineAndFactCheckMls(draftMls, factsJson);
        } catch (_) {
          polished = draftMls;
        }
        polished = stripWordCountLine(polished);
        finalMlsCopy = hasBedBathContradiction(polished, bedrooms, bathrooms)
          ? draftMls
          : (polished || draftMls);
        finalMlsCopy = stripWordCountLine(finalMlsCopy) || finalMlsCopy;
      }
    }

    // ─── Step 5: Score authenticity + confidence ─────────────────────────
    const socialArr = Array.isArray(generated.social_captions) ? (generated.social_captions as string[]) : [];
    const allGeneratedCopy = [
      finalMlsCopy ?? '',
      (generated.airbnb_copy as string | null | undefined) ?? '',
      ...socialArr,
      ...(generateEmail ? [String((generated.email_copy as string | null | undefined) ?? '')] : []),
    ].join(' ');

    const scores = scoreAuthenticity(
      allGeneratedCopy,
      neighborhood,
      vocab,
      photoUrls.length > 0,
      Object.keys(landmarkDistances).length > 0,
    );

    // ─── Step 6: Update generation row ───────────────────────────────────
    const { error: updateErr } = await supabase.from('generations').update({
      mls_copy:                finalMlsCopy,
      airbnb_copy:             (generated.airbnb_copy as string | null | undefined) ?? null,
      social_captions:         socialArr.length ? socialArr : null,
      email_copy:              generateEmail ? ((generated.email_copy as string | null | undefined) ?? null) : null,
      tone:                    (tone as string) ?? 'standard',
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
