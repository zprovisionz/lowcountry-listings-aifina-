# Stripe launch QA (manual)

Run in **Stripe test mode** with Supabase **staging** project secrets aligned to that mode.

## Preconditions

- `VITE_DEBUG_BYPASS_BILLING` is **`false`** in production and staging front-end builds (`import.meta.env.PROD` forces billing UI on regardless of env typo — see `src/config.ts`).
- Edge secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs (`STRIPE_*_PRICE_ID`), `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`.
- Webhook endpoint in Stripe Dashboard points to `https://<project>.supabase.co/functions/v1/stripe-webhook` with the signing secret you deployed.

## Matrix (check each row)

1. **New free user** — Sign up → profile `tier=free`, `generations_limit=3` (after migration `011`), `staging_credits_limit=0`.
2. **Checkout subscription (Starter)** — From Pricing or Account → completes → webhook `customer.subscription.created|updated` → `apply_tier_limits` → `generations_limit` / `staging_credits_limit` match tier.
3. **Upgrade Pro** — Change price on same customer → `profiles` tier and limits update.
4. **Customer portal** — Open portal from Account → cancel at period end or immediately per Stripe test clock.
5. **Subscription deleted** — `customer.subscription.deleted` → `tier=free`, `generations_limit=3`, `staging_credits_limit=0`, subscription fields cleared.
6. **One-time pack** — `checkout.session.completed` with `mode=payment` → `extra_gen_credits` or `extra_staging_credits` increments; row in `credit_purchases`.

## Production checklist

- [ ] `VITE_DEBUG_BYPASS_BILLING` unset or `false` in Vercel **Production** and **Preview**.
- [ ] `ALLOW_TEST_MODE` Edge secret `false` in production unless you intentionally allowlisted internal testers.
- [ ] Webhook signing secret matches the deployed function environment.
