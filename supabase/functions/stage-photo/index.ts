// supabase/functions/stage-photo/index.ts
// Deploy with: supabase functions deploy stage-photo
//
// Required secrets:
//   supabase secrets set FAL_KEY=...
//   supabase secrets set SUPABASE_URL=...
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
//
// This edge function:
// 1. Validates staging quota for the user
// 2. Inserts a staging_queue row (status: 'processing')
// 3. Calls fal.ai image-to-image with a Lowcountry staging prompt
// 4. Uploads the staged image to Supabase Storage
// 5. Updates staging_queue and generations rows
// 6. Supabase Realtime notifies the client automatically

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STAGING_PROMPTS: Record<string, string> = {
  coastal_modern:          'Professional real estate interior photo, coastal modern staging, clean architectural lines, light hardwood floors, white and driftwood palette with ocean blue accents, minimal coastal art, oversized windows, airy and sophisticated, Charleston Lowcountry coastal lifestyle, magazine quality real estate photography',
  lowcountry_traditional:  'Professional real estate interior photo, traditional Lowcountry style staging, natural rattan and wicker furniture, linen upholstery, palmetto leaf motifs, shiplap accent wall, heart-pine floors, antique brass fixtures, sandy beige and seafoam palette, warm inviting Southern charm, authentic Charleston character, bright natural light',
  contemporary:            'Professional real estate interior photo, contemporary staging, bold geometric furniture, dramatic lighting, rich jewel-tone or monochrome palette, statement art pieces, polished surfaces, sophisticated and curated aesthetic, high-end urban feel, architectural detail showcase',
  minimalist:              'Professional real estate interior photo, minimalist staging, bright white walls, warm blonde wood floors, simple functional furniture with clean lines, abundant natural daylight, negative space, airy and calm, serene and uncluttered, Scandinavian-inspired aesthetic',
  luxury_resort:           'Professional real estate interior photo, ultra-luxury resort-grade staging, neutral greige palette, bespoke custom furniture, curated fine art, integrated ambient lighting, seamless indoor-outdoor flow, Architectural Digest quality, concierge-level finish, ultra-premium real estate photography',
  empty_clean:             'Professional real estate interior photo, empty room with no furniture, freshly painted bright white walls, clean polished floors, all clutter removed, bright even natural lighting, architectural photography clearly showing room proportions, ceiling height, trim detail, and window placement',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let stagingId: string | null = null;

  try {
    // ─── Parse payload ──────────────────────────────────────────────────
    const { generationId, photoUrl, stagingStyle = 'coastal_lowcountry', userId } = await req.json();

    if (!generationId || !photoUrl || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: generationId, photoUrl, userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // ─── Check quota ────────────────────────────────────────────────────
    const { data: hasQuota } = await supabase.rpc('check_staging_quota', { p_user_id: userId });
    if (!hasQuota) {
      return new Response(JSON.stringify({ error: 'Staging quota exhausted. Upgrade your plan or purchase credits.' }), {
        status: 402,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // ─── Create staging_queue row ────────────────────────────────────────
    const { data: stagingRow, error: insertErr } = await supabase
      .from('staging_queue')
      .insert({
        generation_id: generationId,
        user_id:       userId,
        original_url:  photoUrl,
        staging_style: stagingStyle,
        status:        'processing',
      })
      .select('id')
      .single();

    if (insertErr || !stagingRow) throw insertErr ?? new Error('Failed to create staging job');
    stagingId = stagingRow.id;

    // ─── Call fal.ai image-to-image ──────────────────────────────────────
    const prompt = STAGING_PROMPTS[stagingStyle] ?? STAGING_PROMPTS['coastal_lowcountry'];
    const falKey = Deno.env.get('FAL_KEY')!;

    const falRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url:            photoUrl,
        prompt,
        strength:             0.62,         // 0 = preserve original, 1 = full generation
        num_inference_steps:  28,
        guidance_scale:       7.5,
        num_images:           1,
        enable_safety_checker: true,
        output_format:        'jpeg',
      }),
    });

    if (!falRes.ok) {
      const falError = await falRes.text();
      throw new Error(`fal.ai error ${falRes.status}: ${falError}`);
    }

    const falData = await falRes.json();
    const stagedImageUrl: string | undefined = falData?.images?.[0]?.url;

    if (!stagedImageUrl) throw new Error('fal.ai returned no image URL');

    // ─── Download staged image and re-upload to Supabase Storage ────────
    // This ensures the image persists beyond fal.ai's CDN TTL (~24h)
    const imageRes = await fetch(stagedImageUrl);
    if (!imageRes.ok) throw new Error('Failed to download staged image from fal.ai');

    const imageBuffer = await imageRes.arrayBuffer();
    const storagePath = `${userId}/staged/${stagingId}.jpg`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('property-photos')
      .upload(storagePath, imageBuffer, {
        contentType:  'image/jpeg',
        cacheControl: '31536000', // 1 year
        upsert:       true,
      });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage
      .from('property-photos')
      .getPublicUrl(storagePath);

    // ─── Update staging_queue → complete ────────────────────────────────
    await supabase.from('staging_queue').update({
      staged_url: publicUrl,
      status:     'complete',
    }).eq('id', stagingId);

    // ─── Append to generation.staged_photo_urls ──────────────────────────
    // Use raw SQL array append to avoid race conditions
    await supabase.rpc('append_staged_photo', {
      p_generation_id: generationId,
      p_url:           publicUrl,
    }).catch(() => {
      // Fallback: read-modify-write (acceptable for single jobs)
      return supabase
        .from('generations')
        .select('staged_photo_urls')
        .eq('id', generationId)
        .single()
        .then(({ data }) => supabase.from('generations').update({
          staged_photo_urls: [...(data?.staged_photo_urls ?? []), publicUrl],
        }).eq('id', generationId));
    });

    // ─── Increment staging credit counter ────────────────────────────────
    await supabase.rpc('increment_staging_count', { p_staging_id: stagingId });

    return new Response(JSON.stringify({ ok: true, stagedUrl: publicUrl, stagingId }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  } catch (err: unknown) {
    console.error('stage-photo error:', err);

    // Mark staging job as failed
    if (stagingId) {
      await supabase.from('staging_queue').update({
        status:        'error',
        error_message: (err as Error).message,
      }).eq('id', stagingId);
    }

    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
