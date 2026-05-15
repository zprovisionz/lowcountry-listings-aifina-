# Audit reconciliation (repository snapshot)

**Recorded:** 2026-05-12  
**Git branch:** `main`  
**HEAD:** see `git log -1` at time of implementation.

## Corrections to the written audit

| Audit statement | This tree |
|-----------------|-----------|
| “No landing page (0/100)” | **Incorrect here.** [`src/LandingApp.tsx`](../src/LandingApp.tsx) serves `/` with Hero, Features, Pricing, UseCases, FAQ, Footer. |
| “3-pass MLS pipeline” | **Matches** [`supabase/functions/generate-listing/index.ts`](../supabase/functions/generate-listing/index.ts) (`refineMlsCopy` + `factCheckMls` after initial generation). Another branch may have collapsed passes; compare SHAs when merging. |
| Mock fallback | **Was present** in `GeneratePage` before launch hardening; see mock policy in commits after this doc. |

## Migrations present at reconciliation

`001`–`005`, `010` only (no `006`–`009` in this checkout). Launch items add **`011_*.sql`** for free-tier default + waitlist table.

## Follow-up

Re-run this checklist after each major merge from feature branches.
