// Apply agent edits to MLS copy while staying within stored generation facts.
// Deploy: supabase functions deploy edit-regenerate-mls

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRESET_HINTS: Record<string, string> = {
  add_piazza: 'If piazza or porch is in the authorized amenities or photo notes, weave it in naturally; otherwise do not add a piazza.',
  remove_fireplace: 'Remove any mention of fireplace unless it is in authorized amenities or photo notes.',
  shorten_opening: 'Shorten the opening paragraph by ~40% while keeping voice.',
  more_lifestyle: 'Add one short paragraph of area lifestyle (Holy City, marsh/tidal context) using only landmark distances already in the facts—no new property claims.',
  tighten_specs: 'Make bed/bath/sqft mentions crisp and MLS-standard; preserve narrative elsewhere.',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const openAiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { generationId, userId, currentMls, userNotes = '', preset = '' } = await req.json();
    if (!generationId || !userId || !currentMls) {
      return new Response(JSON.stringify({ error: 'generationId, userId, and currentMls required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const { data: gen, error: genErr } = await supabase
      .from('generations')
      .select('user_id, bedrooms, bathrooms, sqft, amenities, neighborhood, address, property_type, landmark_distances')
      .eq('id', generationId)
      .single();

    if (genErr || !gen || gen.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Not found or access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const amenities = (gen.amenities as string[]) ?? [];
    const factsJson = JSON.stringify({
      address: gen.address,
      neighborhood: gen.neighborhood,
      property_type: gen.property_type,
      bedrooms: gen.bedrooms,
      bathrooms: gen.bathrooms,
      sqft: gen.sqft,
      amenities,
      landmarks: gen.landmark_distances,
    });

    const presetLine = preset && PRESET_HINTS[preset] ? `\nPreset instruction: ${PRESET_HINTS[preset]}` : '';

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
              'Revise the MLS description per the agent instructions. Remove or avoid any factual claims not in the INPUT FACTS JSON. Preserve elegant Charleston voice and similar length. Return only the revised MLS text.',
          },
          {
            role: 'user',
            content: `INPUT FACTS (JSON):\n${factsJson}\n\nCURRENT MLS:\n${currentMls}\n\nAGENT NOTES:\n${userNotes || '(none)'}${presetLine}\n\nReturn the full revised MLS description only.`,
          },
        ],
        max_tokens: 1200,
        temperature: 0.45,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI ${res.status}: ${t}`);
    }

    const data = await res.json();
    const revised = data.choices?.[0]?.message?.content?.trim();
    if (!revised || revised.length < 80) {
      return new Response(JSON.stringify({ error: 'Revision too short; try again' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const { error: upErr } = await supabase
      .from('generations')
      .update({ mls_copy: revised })
      .eq('id', generationId)
      .eq('user_id', userId);

    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, mls_copy: revised }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (e: unknown) {
    console.error('edit-regenerate-mls:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
