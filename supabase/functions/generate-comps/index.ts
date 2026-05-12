// supabase/functions/generate-comps/index.ts
// Pro+ tier: calls GPT-4o-mini for 3 comparable listings (price, DOM, differentiators).
// Required: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// TODO(cleanup): This edge function is currently UNWIRED from the user-facing UI.
// The Reports page was switched to a Coming-Soon + waitlist (real MLS comps, Q3 2026)
// because AI-generated comps are not honest market data. This function is kept for
// potential backfill / ops tooling — DO NOT re-expose it to end users without
// pairing it with a real MLS data feed and a clear "AI-estimated" disclaimer.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateCompletion } from '../_shared/ai-client.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_TIERS = ['pro_plus', 'team'];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
  const tier = profile?.tier ?? 'free';
  if (!ALLOWED_TIERS.includes(tier)) {
    return new Response(JSON.stringify({ error: 'Comparable listings require Pro+ or Team plan' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!openAiKey && !anthropicKey) {
    return new Response(JSON.stringify({ error: 'AI not configured (set ANTHROPIC_API_KEY and/or OPENAI_API_KEY)' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { address, neighborhood, bedrooms, bathrooms, sqft, propertyType } = body as {
      address: string;
      neighborhood?: string;
      bedrooms?: number;
      bathrooms?: number;
      sqft?: number;
      propertyType?: string;
    };

    if (!address?.trim()) {
      return new Response(JSON.stringify({ error: 'Address required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a Charleston, SC real estate analyst. Given a subject property in the Lowcountry (Charleston, Berkeley, Dorchester counties), generate exactly 3 comparable recent listings. For each comp provide: a plausible street/area name (Charleston-area only), estimated list price range, typical days on market (DOM), and 2-3 key differentiators vs the subject. Be specific to the neighborhood and property type. Output valid JSON only.`;

    const userPrompt = `Subject property:
Address: ${address}
Neighborhood: ${neighborhood ?? 'Charleston area'}
Type: ${propertyType ?? 'single_family'} | Beds: ${bedrooms ?? '—'} | Baths: ${bathrooms ?? '—'} | Sqft: ${sqft ?? '—'}

Respond with this exact JSON structure (no markdown):
{
  "comps": [
    {
      "address": "e.g. 123 King St, Charleston",
      "price_range": "$XXX,XXX - $XXX,XXX",
      "dom": "X-X days",
      "differentiators": ["point 1", "point 2"]
    },
    { ... },
    { ... }
  ],
  "market_notes": "1-2 sentences on current Lowcountry market context for this segment."
}`;

    const content = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
      maxTokens: 800,
      temperature: 0.4,
    });

    const parsed = JSON.parse(content ?? '{}');

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Comps generation failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
