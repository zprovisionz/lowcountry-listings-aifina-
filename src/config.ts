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
  mapsFallbackDelay: 10_000,
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

