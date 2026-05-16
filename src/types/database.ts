// ─── Supabase DB schema (stub — run migrations to create tables) ────
export interface Database {
  public: {
    Tables: {
      early_access_waitlist: {
        Row: {
          id: string;
          email: string;
          source: string;
          created_at: string;
        };
        Insert: { email: string; source?: string };
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          tier: 'free' | 'starter' | 'pro' | 'pro_plus' | 'team';
          generations_used: number;
          generations_limit: number;
          staging_credits_used: number;
          staging_credits_limit: number;
          team_id: string | null;
          role: 'owner' | 'editor' | 'viewer' | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string;
          extra_gen_credits: number;
          extra_staging_credits: number;
          is_test_user?: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          user_id: string;
          address: string;
          neighborhood: string | null;
          property_type: string;
          bedrooms: number | null;
          bathrooms: number | null;
          sqft: number | null;
          amenities: string[];
          photo_urls: string[];
          mls_copy: string | null;
          airbnb_copy: string | null;
          social_captions: string[] | null;
          authenticity_score: number | null;
          confidence_score: number | null;
          improvement_suggestions: string[] | null;
          landmark_distances: Record<string, string> | null;
          status: 'pending' | 'generating' | 'complete' | 'error';
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['generations']['Row']>;
        Update: Partial<Database['public']['Tables']['generations']['Row']>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          logo_url: string | null;
          primary_color: string | null;
          accent_color: string | null;
          shared_generations_used: number;
          shared_generations_limit: number;
          shared_staging_used: number;
          shared_staging_limit: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['teams']['Row']>;
        Update: Partial<Database['public']['Tables']['teams']['Row']>;
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string;
          generation_id: string | null;
          event_type: 'view' | 'copy' | 'download' | 'share' | 'generate';
          /** e.g. low_confidence_override, scope: all_outputs */
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['analytics_events']['Row']>;
        Update: Partial<Database['public']['Tables']['analytics_events']['Row']>;
        Relationships: [];
      };
      team_invites: {
        Row: {
          id: string;
          team_id: string;
          invited_by: string;
          email: string;
          role: string;
          token: string;
          accepted_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['team_invites']['Row']>;
        Update: Partial<Database['public']['Tables']['team_invites']['Row']>;
        Relationships: [];
      };
      mls_connections: {
        Row: {
          id: string;
          user_id: string;
          mls_name: string;
          api_endpoint: string | null;
          access_token_encrypted: string | null;
          status: 'pending' | 'connected' | 'error';
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['mls_connections']['Row']>;
        Update: Partial<Database['public']['Tables']['mls_connections']['Row']>;
        Relationships: [];
      };
      bulk_jobs: {
        Row: {
          id: string;
          user_id: string;
          status: 'pending' | 'running' | 'complete' | 'error';
          total_rows: number;
          processed_rows: number;
          failed_rows: number;
          results: BulkJobResult[];
          error_message: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['bulk_jobs']['Row']>;
        Update: Partial<Database['public']['Tables']['bulk_jobs']['Row']>;
        Relationships: [];
      };
      credit_purchases: {
        Row: {
          id: string;
          user_id: string;
          stripe_payment_intent_id: string | null;
          credit_type: 'generation' | 'staging';
          credits_purchased: number;
          amount_cents: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['credit_purchases']['Row']>;
        Update: Partial<Database['public']['Tables']['credit_purchases']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_profile: {
        Args: Record<string, never>;
        Returns: void;
      };
      append_staged_photo: {
        Args: { p_generation_id: string; p_url: string };
        Returns: void;
      };
      increment_generation_count: {
        Args: { p_generation_id: string };
        Returns: void;
      };
      is_test_user: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      check_staging_quota_n_for_me: {
        Args: { p_n: number };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface BulkJobResult {
  address: string;
  generation_id?: string;
  status: string;
  authenticity_score?: number;
  error?: string;
}

// ─── App domain types ────────────────────────────────────────────────
export type Tier = 'free' | 'starter' | 'pro' | 'pro_plus' | 'team';
export type UserRole = 'owner' | 'editor' | 'viewer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  tier: Tier;
  generations_used: number;
  generations_limit: number;
  staging_credits_used: number;
  staging_credits_limit: number;
  team_id: string | null;
  role: UserRole | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string;
  extra_gen_credits: number;
  extra_staging_credits: number;
  is_test_user?: boolean;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  invited_by: string;
  email: string;
  role: string;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface BulkJob {
  id: string;
  user_id: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  results: BulkJobResult[];
  error_message: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface MlsConnection {
  id: string;
  user_id: string;
  mls_name: string;
  api_endpoint: string | null;
  access_token_encrypted: string | null;
  status: 'pending' | 'connected' | 'error';
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  address: string;
  neighborhood: string | null;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  amenities: string[];
  photo_urls: string[];
  staged_photo_urls: string[] | null;
  mls_copy: string | null;
  airbnb_copy: string | null;
  social_captions: string[] | null;
  authenticity_score: number | null;
  confidence_score: number | null;
  improvement_suggestions: string[] | null;
  landmark_distances: Record<string, string> | null;
  status: 'pending' | 'generating' | 'complete' | 'error';
  created_at: string;
}

export interface StagingJob {
  id: string;
  generation_id: string;
  user_id: string;
  original_url: string;
  staged_url: string | null;
  staging_style: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Wizard form state ───────────────────────────────────────────────
export interface WizardData {
  // Step 1 — Basics
  address: string;
  placeId: string;
  neighborhood: string;
  propertyType: 'single_family' | 'condo' | 'townhouse' | 'airbnb' | 'land' | '';
  bedrooms: number | '';
  bathrooms: number | '';
  sqft: number | '';
  yearBuilt: number | '';
  price: number | '';
  mlsNumber: string;
  // Step 2 — Photos
  photoFiles: File[];
  photoUrls: string[];
  // Step 3 — Amenities
  amenities: string[];
  customAmenities: string;
  // Step 4 — Review / output formats
  generateMLS: boolean;
  generateAirbnb: boolean;
  generateSocial: boolean;
  tone: 'luxury' | 'vacation' | 'investment' | 'standard';
  /** Quick path: MLS = neighborhood overview only; no bed/bath/sqft required */
  overviewOnly: boolean;
}

export const WIZARD_DEFAULTS: WizardData = {
  address: '', placeId: '', neighborhood: '',
  propertyType: '', bedrooms: '', bathrooms: '', sqft: '',
  yearBuilt: '', price: '', mlsNumber: '',
  photoFiles: [], photoUrls: [],
  amenities: [], customAmenities: '',
  generateMLS: true, generateAirbnb: true, generateSocial: true,
  tone: 'standard',
  overviewOnly: false,
};

export const AMENITY_GROUPS: { label: string; items: string[] }[] = [
  {
    label: 'Interiors',
    items: [
      "Chef's Kitchen",
      'Quartz Countertops',
      'Hardwood Floors',
      'Shiplap Walls',
      'Coffered Ceilings',
      'Gas Fireplace',
      'Elevator',
    ],
  },
  {
    label: 'Lowcountry Outdoor',
    items: [
      'Screened Piazza',
      'Wraparound Porch',
      'Live Oaks',
      'Outdoor Kitchen',
      'Inground Pool',
      'Hot Tub',
    ],
  },
  {
    label: 'Waterfront',
    items: [
      'Deep Water Access',
      'Private Dock',
      'Boat Lift',
      'Tidal Creek Access',
      'Boat Storage',
    ],
  },
  {
    label: 'Views',
    items: ['Marsh Views', 'Ocean Views', 'River Views', 'Golf Course Views'],
  },
  {
    label: 'Garage & Utility',
    items: ['3-Car Garage', 'Workshop', 'Guest House / ADU'],
  },
  {
    label: 'Smart & Green',
    items: ['Smart Home System', 'EV Charging', 'Solar Panels'],
  },
  {
    label: 'Community',
    items: ['HOA Amenities', 'Gated Community'],
  },
];

export const AMENITY_OPTIONS: string[] = AMENITY_GROUPS.flatMap((g) => g.items);

export const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'condo',         label: 'Condo / Flat' },
  { value: 'townhouse',     label: 'Townhouse' },
  { value: 'airbnb',        label: 'Short-Term Rental' },
  { value: 'land',          label: 'Land / Lot' },
];

export const LANDMARKS = [
  'Downtown Charleston / King Street',
  'Shem Creek (Mount Pleasant)',
  "Sullivan's Island Beach",
  'Isle of Palms Beach',
  'Folly Beach',
  'Ravenel Bridge',
  'Angel Oak Tree',
  'Magnolia Plantation',
];
