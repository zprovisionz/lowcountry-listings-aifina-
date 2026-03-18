// supabase/functions/bulk-generate/index.ts
// Accepts CSV rows, creates bulk_jobs, invokes generate-listing per row with quota checks.
// Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkRow {
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  propertyType?: string;
  tone?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const authClient = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const userId = user.id;

  try {
    const body = await req.json();
    const { jobId, rows } = body as { jobId?: string; rows: BulkRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or empty rows' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const id = jobId ?? crypto.randomUUID();
    const totalRows = rows.length;

    const { error: insertErr } = await supabase.from('bulk_jobs').insert({
      id,
      user_id: userId,
      status: 'running',
      total_rows: totalRows,
      processed_rows: 0,
      failed_rows: 0,
      results: [],
      error_message: null,
      completed_at: null,
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{ address: string; generation_id?: string; status: string; authenticity_score?: number; error?: string }> = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row?.address?.trim()) {
        results.push({ address: row?.address ?? '', status: 'skipped', error: 'Missing address' });
        failed++;
        processed++;
        await supabase.from('bulk_jobs').update({
          processed_rows: processed,
          failed_rows: failed,
          results: results,
        }).eq('id', id);
        continue;
      }

      const { data: quota } = await supabase.rpc('check_generation_quota', { p_user_id: userId });
      const allowed = (quota as { allowed?: boolean })?.allowed ?? false;
      if (!allowed) {
        await supabase.from('bulk_jobs').update({
          status: 'error',
          error_message: 'Generation quota exceeded',
          processed_rows: processed,
          failed_rows: failed,
          results: results,
          completed_at: new Date().toISOString(),
        }).eq('id', id);
        return new Response(JSON.stringify({ jobId: id }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const { data: genRow, error: genInsertErr } = await supabase.from('generations').insert({
        user_id: userId,
        address: row.address.trim(),
        neighborhood: null,
        property_type: row.propertyType ?? 'single_family',
        bedrooms: row.bedrooms ?? null,
        bathrooms: row.bathrooms ?? null,
        sqft: row.sqft ?? null,
        amenities: [],
        photo_urls: [],
        status: 'generating',
      }).select('id').single();

      if (genInsertErr || !genRow) {
        results.push({ address: row.address, status: 'error', error: genInsertErr?.message ?? 'Failed to create generation' });
        failed++;
        processed++;
        await supabase.from('bulk_jobs').update({
          processed_rows: processed,
          failed_rows: failed,
          results: results,
        }).eq('id', id);
        continue;
      }

      const payload = {
        generationId: genRow.id,
        address: row.address.trim(),
        neighborhood: '',
        propertyType: row.propertyType ?? 'single_family',
        bedrooms: row.bedrooms ?? null,
        bathrooms: row.bathrooms ?? null,
        sqft: row.sqft ?? null,
        price: null,
        amenities: [],
        customAmenities: '',
        tone: row.tone ?? 'standard',
        generateMLS: true,
        generateAirbnb: true,
        generateSocial: true,
        photoUrls: [],
        neighborhoodContext: null,
        neighborhoodLifestyle: [],
      };

      const fnRes = await fetch(`${supabaseUrl}/functions/v1/generate-listing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (fnRes.ok) {
        const fnData = await fnRes.json();
        const scores = (fnData as { scores?: { authenticity?: number } })?.scores;
        results.push({
          address: row.address,
          generation_id: genRow.id,
          status: 'complete',
          authenticity_score: scores?.authenticity,
        });
      } else {
        const errText = await fnRes.text();
        await supabase.from('generations').update({ status: 'error', error_message: errText }).eq('id', genRow.id);
        results.push({
          address: row.address,
          generation_id: genRow.id,
          status: 'error',
          error: errText.slice(0, 200),
        });
        failed++;
      }
      processed++;

      await supabase.from('bulk_jobs').update({
        processed_rows: processed,
        failed_rows: failed,
        results: results,
      }).eq('id', id);
    }

    await supabase.from('bulk_jobs').update({
      status: 'complete',
      completed_at: new Date().toISOString(),
    }).eq('id', id);

    return new Response(JSON.stringify({ jobId: id }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bulk generate failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
