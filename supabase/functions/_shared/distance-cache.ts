import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function getCachedDistances(
  addressHash: string,
): Promise<Record<string, string> | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('distance_cache')
    .select('landmark_distances, expires_at')
    .eq('address_hash', addressHash)
    .maybeSingle();

  if (error || !data) return null;

  const expires = new Date((data as { expires_at: string }).expires_at).getTime();
  if (expires <= Date.now()) return null;

  const distances = (data as { landmark_distances: Record<string, string> | null }).landmark_distances;
  return distances && typeof distances === 'object' ? distances : null;
}

export async function setCachedDistances(
  addressHash: string,
  addressRaw: string,
  distances: Record<string, string>,
): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return;

  const supabase = createClient(url, key);
  const { error } = await supabase.from('distance_cache').upsert(
    {
      address_hash: addressHash,
      address_raw: addressRaw,
      landmark_distances: distances,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'address_hash' },
  );

  if (error) console.warn('distance_cache upsert:', error.message);
}

export async function sha256Hex(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ');
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
