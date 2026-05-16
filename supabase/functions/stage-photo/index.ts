// supabase/functions/stage-photo/index.ts
// Deploy with: supabase functions deploy stage-photo
//
// Prompts + fal strength live in ../_shared/stagingPrompts.ts (tune there; consider a
// higher-fidelity fal model if interiors still look soft after lowering strength).
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
import {
  DEFAULT_STAGING_STYLE,
  FAL_IMAGE_TO_IMAGE_STRENGTH,
  STAGING_PROMPTS,
} from '../_shared/stagingPrompts.ts';

const ALLOWED_ORIGIN = Deno.env.get('APP_PUBLIC_URL') ?? 'http://localhost:5173';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_CAPS: Record<string, number> = {
  free:     5,
  starter:  20,
  pro:      50,
  pro_plus: 100,
  team:     200,
};

const ALLOW_TEST_MODE = (Deno.env.get('ALLOW_TEST_MODE') ?? '').toLowerCase() === 'true';

async function isAllowedTestUser(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  if (!ALLOW_TEST_MODE) return false;
  try {
    const { data } = await supabase.rpc('is_test_user', { p_user_id: userId });
    return !!data;
  } catch {
    return false;
  }
}

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
    const raw = await req.json();
    const generationId: string | undefined = raw?.generationId;
    const photoUrl: string | undefined = raw?.photoUrl;
    const userId: string | undefined = raw?.userId;
    const requestedStyle: string = typeof raw?.stagingStyle === 'string' ? raw.stagingStyle : DEFAULT_STAGING_STYLE;
    const stagingStyle: string = Object.prototype.hasOwnProperty.call(STAGING_PROMPTS, requestedStyle)
      ? requestedStyle
      : DEFAULT_STAGING_STYLE;

    if (!generationId || !photoUrl || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: generationId, photoUrl, userId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // ─── Check quota ────────────────────────────────────────────────────
    const allowTest = await isAllowedTestUser(supabase, userId);
    if (!allowTest) {
      const { data: hasQuota } = await supabase.rpc('check_staging_quota', { p_user_id: userId });
      if (!hasQuota) {
        return new Response(JSON.stringify({ error: 'Staging quota exhausted. Upgrade your plan or purchase credits.' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      // ─── Per-user daily rate limit ──────────────────────────────────────
      const { data: userTier } = await supabase.from('profiles').select('tier').eq('id', userId).single();
      const tier = (userTier as { tier?: string } | null)?.tier ?? 'free';
      const { data: dailyCount } = await supabase.rpc('increment_api_usage', {
        p_user_id: userId,
        p_fn_name: 'stage-photo',
      });
      const cap = DAILY_CAPS[tier] ?? DAILY_CAPS.free;
      if ((dailyCount as number) > cap) {
        return new Response(
          JSON.stringify({ error: 'Daily rate limit exceeded. Try again tomorrow or upgrade your plan.' }),
          { status: 429, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }
      // ─── End rate limit ───────────────────────────────────────────────
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
    const prompt = STAGING_PROMPTS[stagingStyle] ?? STAGING_PROMPTS[DEFAULT_STAGING_STYLE];
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
        strength:             FAL_IMAGE_TO_IMAGE_STRENGTH,
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
    // In test mode, do not consume credits.
    if (!allowTest) {
      await supabase.rpc('increment_staging_count', { p_staging_id: stagingId });
    }

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
