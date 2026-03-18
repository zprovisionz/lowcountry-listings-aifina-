# Lowcountry Listings AI

Charleston-only AI listing generator built in Mount Pleasant for local agents who need speed *without* generic AI nonsense. Generate MLS-ready copy with verified landmark distances, Lowcountry vocabulary, and fact-locked guardrails that reduce hallucinations and protect your reputation.

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in VITE_* vars
npm run dev
```

Open `http://localhost:5173`.

## Why agents love it

- **Saves 2+ hours per listing**: MLS + Airbnb + 3 social captions in one flow
- **Hyper-local accuracy**: verified landmark distances and neighborhood intelligence
- **Flagship safety**: fact-only prompts + refinement + fact-check pass + “Edit & regenerate” on results
- **Charleston voice**: elegant, narrative-style copy tuned for Mount Pleasant, Summerville, and the Charleston metro

## Overview

- **4-step wizard**: Basics (address, type, beds/baths/sqft required unless “neighborhood overview only”) → Photos → Amenities (required for full listing) → Review & generate
- **MLS safety**: Fact-locked prompts, refinement + fact-check passes; **Edit & regenerate** on results (agent notes + presets)
- **Outputs**: MLS description (350–450 words), Airbnb/VRBO copy (200–250 words), 3 social captions
- **Features**: Google Places address autocomplete, OpenAI Vision photo extraction, 8 landmark driving distances, authenticity & confidence scoring, virtual staging (fal.ai, 6 styles; VISION.md references 4 core styles), bulk CSV upload, team accounts, market comps, analytics
- **Monetization**: Stripe subscriptions (Free, Starter, Pro, Pro+, Team) + pay-per-use credit packs

See [VISION.md](VISION.md) for the full product scope and Phase 1 requirements.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **AI**: OpenAI GPT-4o-mini, Vision API; fal.ai for virtual staging
- **Maps**: Google Maps (Places, Geocoding, Distance Matrix)
- **Payments**: Stripe (Checkout, Webhooks, Billing Portal)

## Setup

### Prerequisites

- Node.js 20+
- npm or pnpm

### Install

```bash
npm install
```

### Environment variables

Create `.env.local` in the project root with:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Cloud API key with Maps JavaScript API + Places enabled (client-side) |

These are used by the Vite app at build and runtime. Do not commit real keys; use `.env.local` (gitignored).

### Supabase Edge Functions (server-side)

Configure in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or via Supabase CLI):

| Secret | Used by | Description |
|--------|---------|-------------|
| `OPENAI_API_KEY` | generate-listing, generate-comps, edit-regenerate-mls | OpenAI API key |
| `GOOGLE_MAPS_SERVER_KEY` | generate-listing | Google API key (Geocoding + Distance Matrix) |
| `STRIPE_SECRET_KEY` | stripe-checkout, stripe-webhook, stripe-portal | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | Webhook signing secret |
| `STRIPE_STARTER_PRICE_ID` | stripe-checkout, stripe-webhook | Stripe Price ID for Starter |
| `STRIPE_PRO_PRICE_ID` | stripe-checkout, stripe-webhook | Stripe Price ID for Pro |
| `STRIPE_PRO_PLUS_PRICE_ID` | stripe-checkout, stripe-webhook | Stripe Price ID for Pro+ |
| `STRIPE_TEAM_PRICE_ID` | stripe-checkout, stripe-webhook | Stripe Price ID for Team |
| `SUPABASE_URL` | All edge functions | Same as `VITE_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | Some edge functions | Same as `VITE_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | All edge functions | Supabase service role key (Settings → API) |

Optional for staging: `FAL_KEY` (fal.ai) in Edge Function secrets for `stage-photo`.

### Local Edge Function testing (optional)

Run Supabase locally and serve an Edge Function from your machine:

```bash
supabase start
supabase functions serve generate-listing --env-file ./supabase/.env.local
```

Create `./supabase/.env.local` with the same secrets you set in Supabase Dashboard (see table above). Do **not** commit it.

### Database

Run Supabase migrations in order (SQL Editor or `supabase db push`):

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rpc_functions.sql`
3. `supabase/migrations/003_staging_queue.sql`
4. `supabase/migrations/004_stripe_teams_bulk.sql`

### Run locally

```bash
npm run dev
```

Open `http://localhost:5173`. Sign up or sign in via Supabase Auth (email or Google if configured).

### Build

```bash
npm run build
npm run preview   # optional: preview production build
```

## Project structure

```
src/
  components/     # UI (wizard steps, layout, modals, etc.)
  contexts/      # Auth, Toast
  hooks/         # useGenerations, useStripe, useTeam
  lib/           # supabase client, storage, neighborhoods
  pages/         # Route-level pages (dashboard, generate, results, account, …)
  types/         # database.ts and app types
supabase/
  functions/     # Edge Functions (generate-listing, stripe-checkout, …)
  migrations/    # SQL schema and RLS
```

## Deployment

- **Frontend**: Deploy the Vite build to Vercel (or any static host). See [DEPLOYMENT.md](DEPLOYMENT.md) for a Vercel-focused guide and `vercel.json` in the repo.
- **Backend**: Supabase hosts the database, auth, storage, and Edge Functions. Deploy functions with `npm run supabase:deploy` (or `supabase functions deploy`) after setting secrets.

## Pre-launch checks

See [MANUAL_TESTS.md](MANUAL_TESTS.md) for 10 manual tests to run before launch.

## License

Proprietary. Charleston-only product; no multi-market use.
