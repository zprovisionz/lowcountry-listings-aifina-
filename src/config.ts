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

export const OPENAI = {
  chatCompletionsUrl: 'https://api.openai.com/v1/chat/completions',
  defaultModel: 'gpt-4o-mini',
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

/** Product defaults aligned with `apply_tier_limits` (migration 011) and Pricing copy. */
export const PLAN_LIMITS = {
  free: { generations: 3, stagingCredits: 0 },
  starter: { generations: 100, stagingCredits: 10 },
  pro: { generations: null as null | number, stagingCredits: 40 },
  pro_plus: { generations: null as null | number, stagingCredits: 100 },
  team: { generations: null as null | number, stagingCredits: 200 },
} as const;

/** Max listing photos to stage in one action (server + UI). Align with product tiers. */
export const STAGING_BATCH_MAX_BY_TIER = {
  free: 0,
  starter: 5,
  pro: 10,
  pro_plus: 10,
  team: 10,
} as const satisfies Record<(typeof TIERS.order)[number], number>;

export const DEBUG = {
  /**
   * When true, UI can optionally bypass quota gates for debugging (local only).
   * Forced off in production builds so a mis-set Vercel env cannot disable billing UI.
   * Server-side bypass: `ALLOW_TEST_MODE` Edge secret + `profiles.is_test_user`.
   * Manual QA: see docs/STRIPE_LAUNCH_QA.md
   */
  bypassBilling:
    import.meta.env.PROD
      ? false
      : (import.meta.env.VITE_DEBUG_BYPASS_BILLING ?? '').toLowerCase() === 'true',
} as const;

