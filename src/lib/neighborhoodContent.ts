// Pure helpers for neighborhood landing pages.
//
// Used by:
//   • client React components (NeighborhoodsIndexPage, NeighborhoodPage)
//   • the build-time prerender script (scripts/prerender.mjs)
//
// No runtime LLM calls — copy is composed deterministically from
// charleston_neighborhoods.json (lifestyle / vocab / landmarks / price_range).

export interface Neighborhood {
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

export interface NeighborhoodsFile {
  version: string;
  region: string;
  neighborhoods: Neighborhood[];
}

export const SITE_ORIGIN = 'https://lowcountrylistings.ai';

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function neighborhoodPath(name: string): string {
  return `/neighborhoods/${slugify(name)}`;
}

export function neighborhoodUrl(name: string): string {
  return `${SITE_ORIGIN}${neighborhoodPath(name)}`;
}

export function findNeighborhoodBySlug(
  payload: NeighborhoodsFile,
  slug: string,
): Neighborhood | null {
  const target = slug.toLowerCase();
  return (
    payload.neighborhoods.find((n) => slugify(n.name) === target) ?? null
  );
}

// ─── Copy generation ────────────────────────────────────────────────

function formatList(items: string[], conjunction: 'and' | 'or' = 'and'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}

function compactPrice(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const rounded = m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '');
    return `$${rounded}M`;
  }
  if (n >= 1_000) {
    return `$${Math.round(n / 1_000)}K`;
  }
  return `$${n}`;
}

export function priceRangeLabel(n: Neighborhood): string {
  return `${compactPrice(n.price_range.min)} – ${compactPrice(n.price_range.max)}`;
}

/**
 * Deterministic editorial overview composed from JSON fields.
 * 2–3 sentences, 60–110 words.
 */
export function buildEditorialOverview(n: Neighborhood): string {
  const lifestyleSeed = n.lifestyle.slice(0, 3);
  const vocabSeed = n.vocab.slice(0, 4);
  const landmarkSeed = n.landmarks.slice(0, 3);

  const opener = `${n.name} is the kind of ${n.county} County address where ${formatList(
    lifestyleSeed.slice(0, 2),
  ).toLowerCase()} feel like part of the daily routine, not a once-a-year postcard.`;

  const vocabSentence = vocabSeed.length
    ? `Local listings here lean on the right Lowcountry vocabulary — ${formatList(
        vocabSeed,
      ).toLowerCase()} — so the copy actually matches the way buyers and neighbors talk about the area.`
    : '';

  const landmarkSentence = landmarkSeed.length
    ? `Reference points like ${formatList(landmarkSeed)} sit nearby and give every description a verifiable sense of place, not generic 'close to dining and shopping' filler.`
    : '';

  return [opener, vocabSentence, landmarkSentence].filter(Boolean).join(' ');
}

/**
 * 150–160 character meta description — falls back gracefully when content is thin.
 */
export function buildMetaDescription(n: Neighborhood): string {
  const lifestyle = (n.lifestyle[0] ?? '').toLowerCase();
  const landmark = n.landmarks[0] ?? 'Charleston';
  const base = `Write standout ${n.name} real estate listings with Lowcountry vocabulary, ${lifestyle}, and verified ${landmark} distance — Charleston-only AI copy in seconds.`;
  return clampMeta(base);
}

const META_TRIM_TRAIL = /[\s,;:.\-–—]+$/;

function clampMeta(s: string): string {
  const cleaned = s.replace(/\s+/g, ' ').trim();
  if (cleaned.length >= 150 && cleaned.length <= 160) return cleaned;
  if (cleaned.length > 160) {
    const cut = cleaned.slice(0, 160);
    const lastSpace = cut.lastIndexOf(' ');
    const trimmed = lastSpace > 130 ? cut.slice(0, lastSpace) : cut;
    return trimmed.replace(META_TRIM_TRAIL, '') + '.';
  }
  const suffix = ' Built in Mount Pleasant, SC for Charleston metro agents.';
  const padded = cleaned + suffix;
  if (padded.length <= 160) return padded;
  return padded.slice(0, 159).replace(/\s+\S*$/, '').replace(META_TRIM_TRAIL, '') + '.';
}

export function buildPageTitle(n: Neighborhood): string {
  return `${n.name} Real Estate Listing Copy & Lowcountry Vocabulary | Lowcountry Listings AI`;
}

export function buildIndexTitle(): string {
  return 'Charleston Neighborhoods — Listing Copy & Lowcountry Vocabulary | Lowcountry Listings AI';
}

export function buildIndexMetaDescription(): string {
  const s =
    'Explore all 13 Charleston metro neighborhoods we generate listing copy for — Mount Pleasant, Daniel Island, Folly Beach, Kiawah, and more — with hyper-local vocabulary.';
  return clampMeta(s);
}

// ─── JSON-LD payloads ───────────────────────────────────────────────

export function buildBreadcrumbLd(n: Neighborhood): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_ORIGIN}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Charleston Neighborhoods',
        item: `${SITE_ORIGIN}/neighborhoods`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: n.name,
        item: neighborhoodUrl(n.name),
      },
    ],
  };
}

export function buildIndexBreadcrumbLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_ORIGIN}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Charleston Neighborhoods',
        item: `${SITE_ORIGIN}/neighborhoods`,
      },
    ],
  };
}

export function buildPlaceLd(n: Neighborhood): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: n.name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: n.name,
      addressRegion: 'SC',
      addressCountry: 'US',
    },
    containedInPlace: {
      '@type': 'AdministrativeArea',
      name: `${n.county} County, South Carolina`,
    },
    description: buildEditorialOverview(n),
  };
}
