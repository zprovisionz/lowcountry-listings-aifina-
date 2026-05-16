/**
 * Heuristic checks for MLS copy vs. allowed fact corpus (amenities + custom + vision).
 * Used in tests and optional UI warnings — edge prompts are the primary enforcement.
 */

export function buildMlsFactCorpus(
  amenities: string[],
  customAmenities: string,
  visionSummary: string,
): string {
  return [...amenities, customAmenities, visionSummary].join(' ').toLowerCase();
}

/** Regex + human label for observability in tests */
export const INTERIOR_OR_LAYOUT_CLAIMS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(hardwood|wood\s+flooring|wood\s+floors?|rich\s+wood|heart[- ]pine|engineered hardwood|luxury vinyl|lvp|tile flooring|marble floors?)\b/i, label: 'named flooring' },
  { pattern: /\b(open[- ]concept|open layout|great room flow|seamless flow)\b/i, label: 'open layout claim' },
  { pattern: /\b(soaring|vaulted|tray)\s+ceilings?\b/i, label: 'ceiling type' },
  { pattern: /\b(expansive|floor[- ]to[- ]ceiling|wall of windows?)\b/i, label: 'window wall claim' },
  { pattern: /\b(abundant|generous)\s+natural\s+light\b/i, label: 'lighting claim' },
  { pattern: /\b(master|primary)\s+suite\b/i, label: 'suite framing' },
  { pattern: /\bchef'?s?\s+kitchen\b/i, label: "chef's kitchen" },
  { pattern: /\b(marsh|water)\s+views?\b/i, label: 'view claim' },
];

export function findUnsupportedInteriorClaims(mls: string, corpus: string): string[] {
  const found: string[] = [];
  const c = corpus;
  for (const { pattern, label } of INTERIOR_OR_LAYOUT_CLAIMS) {
    if (!pattern.test(mls)) continue;
    const match = mls.match(pattern);
    const snippet = match?.[0] ?? label;
    if (!corpusContainsSupport(c, snippet, label)) found.push(`${label}: "${snippet}"`);
  }
  return found;
}

function corpusContainsSupport(corpus: string, snippet: string, label: string): boolean {
  const s = snippet.toLowerCase();
  if (corpus.includes(s)) return true;
  // Common amenity wording overlaps
  if (label === "chef's kitchen" && (corpus.includes("chef") || corpus.includes("gourmet"))) return true;
  if (label === 'named flooring' && (corpus.includes('hardwood') || corpus.includes('floor'))) return true;
  if (label === 'open layout claim' && (corpus.includes('open') || corpus.includes('concept'))) return true;
  if (label === 'suite framing' && (corpus.includes('primary') || corpus.includes('master'))) return true;
  if (label === 'view claim' && (corpus.includes('marsh') || corpus.includes('view') || corpus.includes('water'))) return true;
  return false;
}

/** Purple-prose / AI-voice clichés to avoid (tests + documentation) */
export const MLS_VOICE_CLICHES = [
  'warm embrace',
  'like a warm embrace',
  'enchanting',
  'beckons',
  'swept away',
  'oasis',
  'nestled under a canopy',
  'must see',
  'move-in ready',
  "won't last",
];

export function countVoiceClichés(mls: string): number {
  const lower = mls.toLowerCase();
  return MLS_VOICE_CLICHES.filter((p) => lower.includes(p.toLowerCase())).length;
}
