# Vercel deployment guide

This document describes how to deploy the Lowcountry Listings AI frontend to Vercel and which environment variables to set.

## 1. Connect the repo

1. Push the project to GitHub (or GitLab/Bitbucket).
2. In [Vercel](https://vercel.com), go to **Add New → Project** and import the repository.
3. Leave **Framework Preset** as Vite (or auto-detected). **Root Directory** should be the repo root.
4. **Build Command**: `npm run build` (default).
5. **Output Directory**: `dist` (default for Vite).

## 2. Environment variables (Vercel)

In the project’s **Settings → Environment Variables**, add the following. Use **Production**, and optionally **Preview** for branch deployments.

| Name | Value | Notes |
|------|--------|--------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | From Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon/public key |
| `VITE_GOOGLE_MAPS_API_KEY` | `AIza...` | Google Cloud API key (Maps JavaScript API + Places) |

- All three are required for the app to work (auth, data, address search).
- Do not add Supabase service role key or Stripe secret keys here; they are used only in Supabase Edge Functions (server-side).

## 3. Build and deploy

- **Deploy**: Vercel will build and deploy on every push to the main branch (or as configured).
- **Preview**: Each PR typically gets a preview URL; use the same env vars in Preview if you want full functionality there.

## 4. Post-deploy

1. **Supabase Auth**: In Supabase Dashboard → Authentication → URL Configuration, set **Site URL** to your Vercel production URL (e.g. `https://your-app.vercel.app`) and add it to **Redirect URLs** (and add `https://your-app.vercel.app/auth/callback` for OAuth).
2. **Stripe**: If using live Stripe, set the webhook endpoint to your Supabase Edge Function URL for `stripe-webhook` and use the same Site URL where needed for redirects.
3. **Google**: Ensure the Maps API key allows your Vercel domain in referrer restrictions (or use no restriction for testing).

## 5. `vercel.json` in this repo

The project includes a `vercel.json` that:

- Uses `dist` as the output directory and Vite as the framework.
- Rewrites all routes (except `/auth/callback` if you need it for something else) to `/index.html` for client-side routing (SPA).
- Sets long cache headers for `/assets/*` for better performance.

No changes to `vercel.json` are required for a standard deploy once the repo is connected and env vars are set.

## 6. Supabase Edge Functions (including Edit & Regenerate MLS)

Functions only appear in **Supabase Dashboard → Edge Functions** after you **deploy** them from your machine. Code in `supabase/functions/` is not synced automatically.

From the project root (with [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in, project linked):

```bash
# Deploy the MLS edit/regenerate function (required for "Edit & regenerate" on Results)
npx supabase functions deploy edit-regenerate-mls

# Or: npm run supabase:deploy:edit-mls
```

Deploy other functions the same way, e.g. `npx supabase functions deploy generate-listing`.

After a successful deploy, refresh **Dashboard → Edge Functions** — you should see `edit-regenerate-mls` listed.
