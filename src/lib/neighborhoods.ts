// src/lib/neighborhoods.ts
// Loads the canonical neighborhood data from /public/charleston_neighborhoods.json
// and provides a lookup by name or alias.

interface NeighborhoodData {
  name: string;
  aliases: string[];
  county: string;
  vocab: string[];
  lifestyle: string[];
  landmarks: string[];
  price_range: { min: number; max: number };
  property_types: string[];
  keywords_for_ai: string;
}

interface NeighborhoodsFile {
  version: string;
  region: string;
  neighborhoods: NeighborhoodData[];
}

let _cache: NeighborhoodData[] | null = null;

async function loadNeighborhoods(): Promise<NeighborhoodData[]> {
  if (_cache) return _cache;
  try {
    const res = await fetch('/charleston_neighborhoods.json');
    const json: NeighborhoodsFile = await res.json();
    _cache = json.neighborhoods;
    return _cache;
  } catch {
    return [];
  }
}

/**
 * Returns the neighborhood entry whose name or aliases match the given string.
 * Falls back to null if not found.
 */
export async function lookupNeighborhood(name: string): Promise<NeighborhoodData | null> {
  if (!name) return null;
  const all = await loadNeighborhoods();
  const lower = name.toLowerCase();
  return all.find(n =>
    n.name.toLowerCase() === lower ||
    n.aliases.some(a => a.toLowerCase() === lower)
  ) ?? null;
}
