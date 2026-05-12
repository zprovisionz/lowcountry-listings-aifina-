export const COLORS = {
  cyan: '#00ffff',
  magenta: '#ff00ff',
  greenNeon: '#00ff96',
  space: '#0a0a1f',
} as const;

export const TIMING_MS = {
  invokeTimeout: 90_000,
  resultsPollInterval: 2_000,
  resultsPollMaxAttempts: 45, // ~90s at 2s interval
  authSafetyTimeout: 10_000,
  copyFeedbackDuration: 2_200,
  toastDuration: 4_000,
} as const;

// Charleston / Berkeley / Dorchester metro bounding box (rough)
export const CHARLESTON_BOUNDS = {
  north: 33.2,
  south: 32.5,
  east: -79.6,
  west: -80.5,
} as const;

export const GOOGLE_MAPS = {
  jsApiBaseUrl: 'https://maps.googleapis.com/maps/api/js',
  libraries: ['places'] as const,
} as const;

export const AI = {
  anthropicMessagesUrl: 'https://api.anthropic.com/v1/messages',
  openaiChatCompletionsUrl: 'https://api.openai.com/v1/chat/completions',
  primaryModel: 'claude-3-5-sonnet-20241022',
  fallbackModel: 'gpt-4o-mini',
} as const;

export const GOOGLE_MAPS_SERVER = {
  geocodeUrl: 'https://maps.googleapis.com/maps/api/geocode/json',
  distanceMatrixUrl: 'https://maps.googleapis.com/maps/api/distancematrix/json',
} as const;

export const FAL = {
  imageToImageUrl: 'https://fal.run/fal-ai/flux/dev/image-to-image',
} as const;

// Single source of truth for the 8 verified landmarks used in Distance Matrix.
export const LANDMARKS = {
  'Downtown Charleston / King Street': { lat: 32.7765, lng: -79.9311 },
  'Shem Creek (Mount Pleasant)':       { lat: 32.7936, lng: -79.8841 },
  "Sullivan's Island Beach":           { lat: 32.7657, lng: -79.8425 },
  'Isle of Palms Beach':               { lat: 32.7873, lng: -79.7971 },
  'Folly Beach':                       { lat: 32.6551, lng: -79.9403 },
  'Ravenel Bridge':                    { lat: 32.7957, lng: -79.9330 },
  'Angel Oak Tree':                    { lat: 32.7068, lng: -80.0988 },
  'Magnolia Plantation':               { lat: 32.8187, lng: -80.0986 },
} as const;

export const TIERS = {
  order: ['free', 'starter', 'pro', 'pro_plus', 'team'] as const,
  display: {
    free:      { name: 'Free',      monthly: 0 },
    starter:   { name: 'Starter',   monthly: 19 },
    pro:       { name: 'Pro',       monthly: 39 },
    pro_plus:  { name: 'Pro+',      monthly: 59 },
    team:      { name: 'Team',      monthly: 149 },
  },
} as const;

/**
 * Per-tier plan limits — single source of truth for the React app.
 * `generations: null` means unlimited (mapped to DB sentinel `-1` at write time).
 * `formats` flags which output formats are unlocked on each tier.
 */
export const PLAN_LIMITS = {
  free: {
    generations: 3,
    stagingCredits: 0,
    formats: { mls: true, airbnb: true, social: true, email: true },
  },
  starter: {
    generations: 100,
    stagingCredits: 10,
    formats: { mls: true, airbnb: true, social: true, email: true },
  },
  pro: {
    generations: null,
    stagingCredits: 40,
    formats: { mls: true, airbnb: true, social: true, email: true },
  },
  pro_plus: {
    generations: null,
    stagingCredits: 100,
    formats: { mls: true, airbnb: true, social: true, email: true },
  },
  team: {
    generations: null,
    stagingCredits: 200,
    formats: { mls: true, airbnb: true, social: true, email: true },
  },
} as const;

export type PlanFormat = 'mls' | 'airbnb' | 'social' | 'email';

/** Default output format flags, applied when a profile has no `default_formats`. */
export const DEFAULT_FORMAT_FLAGS: Record<PlanFormat, boolean> = {
  mls: true,
  airbnb: true,
  social: true,
  email: true,
};

/** DB column `generations_limit` uses -1 as the "unlimited" sentinel. */
export const UNLIMITED_GEN_DB_SENTINEL = -1;

/** Pretty-print a plan's generation cap (e.g. "3 / month", "Unlimited"). */
export function formatGenerationsLabel(tier: keyof typeof PLAN_LIMITS): string {
  const cap = PLAN_LIMITS[tier].generations;
  return cap === null ? 'Unlimited' : `${cap} / month`;
}

/** Pretty-print a plan's monthly staging-credit allocation. */
export function formatStagingLabel(tier: keyof typeof PLAN_LIMITS): string {
  const credits = PLAN_LIMITS[tier].stagingCredits;
  return credits === 0 ? 'None' : `${credits} credits / mo`;
}

export const DEBUG = {
  /**
   * When true, UI can optionally bypass quota gates for debugging.
   * Server-side bypass is still controlled separately via the `ALLOW_TEST_MODE` Edge secret
   * and `profiles.is_test_user` allowlisting.
   */
  bypassBilling: (import.meta.env.VITE_DEBUG_BYPASS_BILLING ?? '').toLowerCase() === 'true',
} as const;

