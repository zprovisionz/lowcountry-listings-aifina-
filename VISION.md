# Lowcountry Listings AI — Phase 1 Vision Document
Last Updated: March 07, 2026  
Author: Zach (Charleston, SC)  
Project Goal: Build a hyper-local, production-ready SaaS tool that dominates Charleston real estate listing creation and marketing automation.

## 1. Core Purpose
Lowcountry Listings AI is a Charleston-only AI platform that helps real estate agents, property managers, and Airbnb hosts create professional, hyper-local listing content faster and better than ChatGPT or national competitors.

It solves two problems:
- Agents cannot reliably get authentic Lowcountry voice, verified landmark distances, and neighborhood-specific insights from generic AI.
- In a cooling 2026 market (longer DOM, rising inventory), agents need standout, emotionally resonant listings + visuals + analytics to win listings and close faster.

## 2. Phase 1 Scope (Charleston Metro Only – No Expansion Yet)
Geographic focus: Charleston, Berkeley, Dorchester counties only.

### Must-Have Features
- MLS-style descriptions (350–450 words)
- Airbnb/VRBO guest-focused copy (200–250 words)
- 3 social media captions with hashtags
- Quick Generate from address only (Google Places autocomplete, Charleston-bounded)
- 4-step wizard: Basics → Photos → Amenities → Review
- Photo upload (up to 10) → OpenAI Vision feature extraction
- Virtual staging (4 styles: Coastal Modern, Lowcountry Traditional, Contemporary, Minimalist) with realtime progress
- Authenticity scoring (Lowcountry terminology usage) + confidence scoring + improvement suggestions
- Neighborhood intelligence: auto-detect from address, insert selling points + typical amenities + vocabulary replacements (“porch” → “piazza”, etc.)
- Verified driving distances to 8 fixed landmarks:
  1. Downtown Charleston / King Street
  2. Shem Creek (Mount Pleasant)
  3. Sullivan’s Island Beach
  4. Isle of Palms Beach
  5. Folly Beach
  6. Ravenel Bridge
  7. Angel Oak Tree
  8. Magnolia Plantation
- Bulk generation via CSV upload
- MLS data pull (RESO Web API stub – secure token storage, pull beds/baths/sqft/photos/address)
- Team accounts: shared quotas, multi-user dashboard, roles (owner/editor/viewer), custom branding (logo, colors)
- Market reports & comparable listings (comps) generation
- Performance analytics: track views, copies, engagement (embedded pixels → analytics_events table)

### Explicitly Excluded from Phase 1
- Multi-city expansion
- Lead generation / CRM
- Mobile app
- White-label for non-Charleston firms
- Advanced AI training / custom models

## 3. Monetization – Hybrid Model (Subscriptions + Pay-Per-Use)
Freemium entry → tiered recurring → pay-per-use extras for variable usage.

| Tier     | Monthly | Annual (20% off) | Generations                  | Staging Credits              | Key Features                                      | Best For                     |
|----------|---------|------------------|------------------------------|------------------------------|---------------------------------------------------|------------------------------|
| Free     | $0      | —                | 10/month                     | None                         | MLS only, basic analytics                         | Testing / light users        |
| Starter  | $19     | $182             | 100/month + $0.75/extra      | 10/month + $0.75/extra       | MLS + Airbnb/social, bulk, basic reports          | Solo moderate-volume agents  |
| Pro      | $39     | $374             | Unlimited + $0.75/extra      | 40/month + $5/10 packs       | All formats, full staging, comps, analytics       | High-volume solo agents      |
| Pro+     | $59     | $566             | Unlimited                    | 100/month + $5/10 packs      | Priority support, advanced reports                | Luxury / investor agents     |
| Team     | $149    | $1,430           | Unlimited shared             | 200/month shared + packs     | Multi-user seats, shared dashboard, custom branding | Brokerages / teams (3-15+)   |

- Pay-per-use: $0.75 per extra generation, $0.75 per extra staging, purchasable credit packs ($5/10, $10/20, etc.)
- In-app upsells: quota warnings, modal prompts (“Upgrade to Pro?” or “Buy 20 extras for $10?”)
- Annual billing discount: 20%
- Stripe: subscriptions + one-time micro-transactions + webhooks

## 4. Tech Stack (Exact)
Frontend: React 18 + TypeScript + Vite  
Styling: Tailwind CSS v4 + custom neon agentic animations  
Backend: Vercel Serverless Functions (Node.js 20)  
Database & Auth: Supabase (PostgreSQL + RLS + Realtime)  
AI: OpenAI GPT-4o-mini (main) + Vision API  
Geocoding: Geocod.io + Google Maps Distance Matrix  
Payments: Stripe  
Hosting: Vercel

## 5. Design System – Neon Agentic Aesthetic (bolt.new Inspired)
- Dominant colors:  
  --primary: #00ffff (electric cyan)  
  --accent: #ff00ff (neon magenta)  
  --bg-dark: #0a0a1f (deep space)  
  --bg-card: rgba(15, 15, 45, 0.65) (glass)  
  --text-primary: #e0ffff  
  --border: rgba(0, 255, 255, 0.3)  

- Key animations:  
  electricPulse (glowing buttons/loaders)  
  particleDrift (cyan dots floating)  
  hover-lift (cards rise + glow)  
  laserBeam (hero sweep)  
  success-pop (completion burst)  

- Glassmorphism cards, neon borders, pulse on interaction, particles in hero & dashboard backgrounds.

## 6. Success Metrics (Phase 1 Targets)
- Month 3: 50 paying users, ~$2K–$5K MRR  
- Month 6: 150–250 users, $12K–$25K MRR (floor $4K–$8K)  
- Month 12: 300–400 users, $20K–$60K+ MRR  
- Retention: >75% monthly  
- Blended ARPU: $35–$70 (with pay-per-use & teams)

## 7. Strict Rules for Development
- Stay Charleston-only (no multi-market code)
- No features outside this document
- Prioritize polish: loading states, error handling, mobile responsiveness, success animations
- Security first: RLS on all tables, rate limiting, token encryption
- Code must be clean, typed, production-ready

This is the single source of truth. Every Claude prompt must reference and obey this file.
