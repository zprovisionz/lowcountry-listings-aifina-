export type NeighborhoodRow = { name: string; aliases?: string[] };

export type CharlestonNeighborhoodsPayload = {
  neighborhoods: NeighborhoodRow[];
};

let fetchPromise: Promise<CharlestonNeighborhoodsPayload> | null = null;

async function loadNeighborhoodsJson(): Promise<CharlestonNeighborhoodsPayload> {
  const res = await fetch('/charleston_neighborhoods.json', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Failed to load neighborhoods: ${res.status}`);
  return (await res.json()) as CharlestonNeighborhoodsPayload;
}

/** Cached fetch of `/charleston_neighborhoods.json` (Vite public/). */
export function ensureNeighborhoodsLoaded(): Promise<CharlestonNeighborhoodsPayload> {
  if (!fetchPromise) fetchPromise = loadNeighborhoodsJson();
  return fetchPromise;
}

/**
 * Match `address` against neighborhood `name` and `aliases` (case-insensitive substring).
 * When multiple candidates match, the longest matched phrase wins (more specific).
 */
export function matchNeighborhoodFromRows(address: string, neighborhoods: NeighborhoodRow[]): string {
  const hay = address.toLowerCase();
  let best: { name: string; len: number } | null = null;

  for (const n of neighborhoods) {
    const candidates = [n.name, ...(n.aliases ?? [])];
    for (const c of candidates) {
      const needle = c.toLowerCase();
      if (!needle) continue;
      if (hay.includes(needle)) {
        if (!best || needle.length > best.len) best = { name: n.name, len: needle.length };
      }
    }
  }

  return best?.name ?? 'Charleston Metro';
}

/** Async: loads public JSON then matches. */
export async function detectNeighborhood(address: string): Promise<string> {
  const trimmed = address.trim();
  if (!trimmed) return 'Charleston Metro';
  try {
    const data = await ensureNeighborhoodsLoaded();
    return matchNeighborhoodFromRows(trimmed, data.neighborhoods);
  } catch (e) {
    console.warn('detectNeighborhood: falling back to metro', e);
    return 'Charleston Metro';
  }
}
