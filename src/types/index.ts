export interface PricingTier {
  name: string;
  monthly: number | null;
  annual: number | null;
  generations: string;
  stagingCredits: string;
  features: string[];
  bestFor: string;
  cta: string;
  popular?: boolean;
  accentColor: 'cyan' | 'magenta' | 'both';
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
  tag?: string;
}

export interface Testimonial {
  name: string;
  role: string;
  agency: string;
  quote: string;
  rating: number;
  neighborhood: string;
}

export interface LivePreviewData {
  address: string;
  neighborhood: string;
  distance: string;
  snippet: string;
  score: number;
}
