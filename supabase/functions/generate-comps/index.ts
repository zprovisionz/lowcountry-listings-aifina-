// supabase/functions/generate-comps/index.ts
// Pro+ tier: calls GPT-4o-mini for 3 comparable listings (price, DOM, differentiators).
// Required: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  if (!openAiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI not configured' }), {
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

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 800,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${errText}` }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
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
