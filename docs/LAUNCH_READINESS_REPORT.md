# Launch readiness report

**Date:** 2026-05-15  
**Scope:** Connectivity, pricing/copy integrity, trust, conversion paths, core flows  
**Verification:** `npx tsc --noEmit -p tsconfig.app.json` ✅ · `npx vitest run` ✅ (8 tests)

---

## Issues found

| Area | Issue |
|------|--------|
| Marketing | Hero/Footer still said **10** free generations/listings (migration 011 sets **3**) |
| Account | Free tier card showed `10/mo` |
| Dashboard | Pro plan card advertised **MLS data pull** (not shipped) |
| Pricing | Pro+ listed **Advanced market reports** without waitlist qualifier |
| Product | Free users could enable Airbnb/social in wizard while Pricing says excluded |
| Quota UI | Top bar ignored `extra_gen_credits`; QuotaWarning used base limit for ratio |
| Nav | Reports had no “coming soon” signal in sidebar |

## Fixes made

| File | Change |
|------|--------|
| `src/components/Footer.tsx` | Free tier copy from `PLAN_LIMITS` (3 gens) |
| `src/components/Hero.tsx` | CTA uses `PLAN_LIMITS.free.generations` |
| `src/pages/account/AccountPage.tsx` | Free tier `3/mo` via `PLAN_LIMITS` |
| `src/pages/dashboard/DashboardPage.tsx` | Honest Pro/Pro+ bullets; quota math includes bonus credits |
| `src/components/Pricing.tsx` | Pro+ → “MLS-backed market reports (waitlist)” |
| `src/components/layout/Sidebar.tsx` | Reports nav badge `SOON` |
| `src/components/layout/TopBar.tsx` | Page meta for bulk/analytics; GEN chip includes bonus credits |
| `src/components/ui/QuotaWarning.tsx` | Effective limit ratio; “View plans” → `/account` |
| `src/components/wizard/Step4Review.tsx` | Lock Airbnb/social on free; Starter+ badge |
| `src/pages/generate/GeneratePage.tsx` | Free tier resets formats; server payload gated |
| `src/components/FAQ.tsx` | Free plan FAQ (3 gens, gating) |

**Already correct (no change needed):**  
- No `/pricing` route dead links (`/#pricing` on landing)  
- `ReportsPage` = waitlist only (no fake comps)  
- `DEBUG.bypassBilling` forced off in production  
- `applyMockFallback` DEV-only  
- Stripe CTAs via `useStripe` + auth redirect  
- `STAGING_DISCLOSURE` on Results staging tab  

## Pricing concerns (human judgment)

| Topic | Notes |
|-------|--------|
| **gen_10 pack $7.50 vs $0.75/extra** | Landing says $0.75/generation; 10-pack is $7.50 ($0.75/ea) — consistent. 20-pack $10 is a discount. |
| **Annual toggle** | Pricing UI supports annual display; confirm all `STRIPE_*_PRICE_ID` annual IDs wired in checkout. |
| **Migration 011** | Must be applied in production so new signups get `generations_limit=3`. Existing free at 10 are migrated by SQL. |
| **Unlimited tiers** | Pro/Pro+/Team “unlimited” depends on `generations_limit=-1` from webhook — verify in Stripe QA matrix. |
| **Priority AI / early access** | Pro+ marketing claims; confirm product intent or soften copy. |

## Remaining blockers

1. **Run Stripe test matrix** (`docs/STRIPE_LAUNCH_QA.md`) on staging — not verifiable in code-only pass.  
2. **Apply migration `011_launch_free_tier_waitlist.sql`** to production Supabase if not already.  
3. **Vercel env:** `VITE_DEBUG_BYPASS_BYPASS_BILLING=false`, Edge `ALLOW_TEST_MODE=false` in prod.  
4. **MLS / comps:** Still roadmap; UI is waitlist-only — OK for launch if positioned honestly.  
5. **Server-side free-tier format gate** (optional): Edge `generate-listing` could reject Airbnb/social for `tier=free` as defense-in-depth.

## Launch readiness score: **8 / 10**

Strong: routes, auth, billing hooks, honest reports, staging disclosure, dev/prod mock split, aligned free-tier copy after this pass.  
Gaps: live Stripe/webhook QA, migration deploy confirmation, optional server-side tier enforcement.

## Owner summary

**Good to go (with deploy checklist):** Landing → login → dashboard → generate → results; account upgrades; bulk/team upsell pages; reports waitlist.  

**Needs human judgment:** Stripe live/test promotion, migration 011 on prod DB, annual price IDs, whether Pro+ “priority processing” is real yet, marketing review of VISION.md (still mentions 10 free / comps on Pro).
