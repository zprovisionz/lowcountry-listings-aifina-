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

// Few-shot MLS voice examples (Mount Pleasant + Summerville metro). Style only — model must still use only AUTHORIZED FACTS.
const MLS_FEW_SHOT_EXAMPLES = `

=== FEW-SHOT STYLE EXAMPLES (sentence rhythm and emotional tone ONLY) ===
CRITICAL: Do NOT copy piazza, live oaks, fireplace, chef kitchen, marsh views, layout, or any feature from these examples unless that exact feature appears in AUTHORIZED FACTS or Photo-derived details below.

[Mount Pleasant — arrival & piazza / live oaks]
"The first time you turn onto the street, you feel it: the canopy of live oaks, the quiet hum of a neighborhood that still knows its neighbors. This Mount Pleasant home doesn't announce itself with flash—it invites you in with a wide, shaded piazza where the coastal breeze moves through the screens and the only soundtrack is the rustle of palmetto fronds. This is the Holy City at its most lived-in—a place where evenings begin with sweet tea on the piazza and end with marsh views and the glow of Shem Creek sunsets a short drive away."

[Mount Pleasant — classic family / piazza & entertaining]
"Nestled under a canopy of live oaks in the heart of Mount Pleasant, this charming Lowcountry retreat offers the perfect blend of timeless elegance and modern comfort. Step onto the welcoming piazza and feel the gentle coastal breeze that defines life in the Holy City. Inside, soaring ceilings and abundant natural light create an open, airy flow ideal for both quiet evenings and effortless entertaining. Outside, the beautifully landscaped yard beckons for al fresco dining or lazy afternoons with the family."

[Mount Pleasant — marsh views / Shem Creek / Sullivan's]
"Experience elevated Lowcountry living in this thoughtfully designed Mount Pleasant home. A charming farmhouse exterior and welcoming covered front porch set the tone for relaxed coastal elegance. Inside, the open-concept layout flows seamlessly from the chef's kitchen to the living spaces, where natural light pours in and marsh views inspire tranquility. Minutes from Shem Creek's renowned waterfront dining and Sullivan's Island beaches, this residence places the best of the Lowcountry at your doorstep."

[Mount Pleasant — Old Village / historic charm]
"In the sought-after Old Village of Mount Pleasant, this elegant residence captures the essence of Lowcountry living. Mature live oaks frame the property, creating a serene backdrop for the wide piazza that invites quiet mornings with coffee or evening gatherings with friends. The interior blends classic Charleston details with contemporary finishes, offering a lifestyle of refined comfort just steps from the historic charm and waterfront of the Holy City."

[Summerville — traditional / schools & downtown]
"Nestled in a quiet Summerville neighborhood, this charming home offers the perfect blend of classic Southern style and modern updates. Step inside to find spacious living areas filled with natural light and timeless details. The kitchen opens to the family room, creating an ideal space for both daily life and holiday gatherings. Outside, the fenced yard provides privacy and room for outdoor enjoyment. Conveniently located near excellent schools and downtown Summerville, this residence offers the lifestyle you've been waiting for."
`;

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
              text: `You are a Charleston, SC real estate expert analyzing property photos for MLS listing copy.

Identify and list specific details visible in these photos:
1. Architectural features (piazza/porch style, window types, ceiling height, moldings, columns)
2. Interior finishes (floor type, countertops, cabinet style, hardware, backsplash)
3. Lowcountry-specific elements (shiplap, board-and-batten, tongue-and-groove, tabby, heart pine)
4. Standout selling features (fireplace, built-ins, coffered ceiling, exposed brick, beams)
5. Condition and quality tier (luxury, upscale, mid-range, value)
6. Natural light and space feel

Return a concise paragraph (max 120 words) describing key visual details a copywriter should weave into an authentic Charleston listing. Be specific — mention exact finishes and features visible. Do not invent details not visible in the photos.`,
            },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
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
          content: 'You are an expert editor for Charleston, SC real estate listings. Rewrite only for style and flow. Do not add or invent any facts, features, room counts, or distances not present in the description. Only improve style, flow, and emotional depth—never add new factual claims. Preserve or deepen the evocative, human voice; do not make the copy drier or more generic. Return only the rewritten MLS description, no preamble or word count.',
        },
        {
          role: 'user',
          content: `Rewrite this MLS description to sound 100% human-written by a top Charleston agent. Remove repetition, improve flow, add emotional depth, ensure 400+ words. Do not add or invent any facts. Return only the rewritten MLS description, no preamble or word count.\n\n---\n\n${stripped}`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.6,
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
            'Review the MLS description. Remove any factual claims about the property that are NOT supported by the INPUT FACTS JSON (beds, baths, sqft, amenities list, vision text, landmarks). Preserve voice, flow, length (~400 words target), and rich atmospheric language (e.g. "gentle coastal breeze," "neighborhood rhythm") when it does not assert a specific unlisted feature. If the copy mentions piazza, fireplace, pool, dock, chef kitchen, live oaks on the lot, room layout, or finishes not in the facts, remove or generalize those sentences. Return ONLY the cleaned MLS description, no preamble.',
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

improvement_suggestions: first MUST be exactly: "Add more details for full listing? Enter bedrooms, bathrooms, square footage, and amenities on a new generation for property-specific MLS copy." Second: one other actionable tip.

Respond ONLY with valid JSON: { "mls_copy", "airbnb_copy", "social_captions", "improvement_suggestions" }. Null unused fields.`;
    } else {
      systemPrompt = `You are a top ${neighborhoodName} agent with 15+ years writing MLS listings. Write in an elegant, human, immersive voice — never robotic or repetitive.
${FACT_ONLY_RULES}
Never invent or assume factual claims beyond the AUTHORIZED FACTS block. Use rich, immersive language and emotional storytelling—elegant and narrative, not bland or list-like.
Neighborhood atmosphere vocabulary (use only where it does not falsely attribute a feature to this property): ${vocab.join(', ')}.
${neighborhoodContext ? `Neighborhood copywriting guide: ${neighborhoodContext}` : ''}
${lifestyleHints ? `Key lifestyle selling points: ${lifestyleHints}` : ''}
Tone requested: ${tone ?? 'standard'}.
Never use generic real estate clichés ("must see", "stunning", "move-in ready", "won't last long").
${generateMLS ? MLS_FEW_SHOT_EXAMPLES : ''}`;

      const authorizedFacts = `AUTHORIZED FACTS — text-only; every structural/feature claim in MLS must be traceable to this list or photo-derived line:
Address: ${address}
Neighborhood: ${neighborhood ?? 'Charleston, SC'}
Property type: ${propertyType}
Bedrooms: ${bedrooms ?? 'not specified'} | Bathrooms: ${bathrooms ?? 'not specified'} | Sqft: ${sqft ?? 'not specified'} | Price: ${price ? `$${Number(price).toLocaleString()}` : 'not specified'}
Amenities / features you MAY mention by name: ${allAmenities.length ? allAmenities.join(', ') : 'none listed—do not invent features'}
Landmark distances (use these exact distances only): ${nearbyLandmarks || 'none'}
${visionSummary ? `Photo-derived details (ONLY other source for finishes/layout/features): ${visionSummary}` : 'No photo analysis—do not describe interior finishes, rooms, or exterior features not in amenities.'}
You have full creative freedom on voice, mood, and non-specific atmosphere. Do not add facts.`;

      const mlsInstructions = generateMLS ? `
Generate MLS_DESCRIPTION (target 400–450 words). Structure:
1. Opening hook: arrival / street / neighborhood feel (no false claims about this home's exterior unless in facts/photos).
2. Interior: room-by-room ONLY using beds/baths/sqft + amenities + photo details—no extra rooms or finishes.
3. Exterior & lifestyle: landmark distances from list; area lifestyle; mention piazza/marsh/pool/dock ONLY if in amenities or photos.
4. Closing: private tour CTA.
End with: [Word count: XXX]` : '';

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
        temperature: 0.72,
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

    await supabase.rpc('increment_generation_count', { p_generation_id: generationId });

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
