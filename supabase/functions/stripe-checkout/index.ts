// supabase/functions/stripe-checkout/index.ts
// Creates Stripe Checkout (subscription) or PaymentIntent (credit pack).
// Required secrets: STRIPE_SECRET_KEY, STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID,
//   STRIPE_PRO_PLUS_PRICE_ID, STRIPE_TEAM_PRICE_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICE_IDS: Record<string, string> = {
  starter: Deno.env.get('STRIPE_STARTER_PRICE_ID') ?? '',
  pro: Deno.env.get('STRIPE_PRO_PRICE_ID') ?? '',
  pro_plus: Deno.env.get('STRIPE_PRO_PLUS_PRICE_ID') ?? '',
  team: Deno.env.get('STRIPE_TEAM_PRICE_ID') ?? '',
};

// Credit packs: packType -> { price in cents, credits }
const CREDIT_PACKS: Record<string, { amount: number; credits: number; type: 'generation' | 'staging' }> = {
  gen_10: { amount: 750, credits: 10, type: 'generation' },
  gen_20: { amount: 1000, credits: 20, type: 'generation' },
  staging_10: { amount: 500, credits: 10, type: 'staging' },
  staging_20: { amount: 1000, credits: 20, type: 'staging' },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const body = await req.json();
    const { mode, priceId, packType } = body as { mode: 'subscription' | 'payment'; priceId?: string; packType?: string };

    if (mode === 'subscription') {
      const tierOrPriceId = priceId ?? body.priceId;
      if (!tierOrPriceId) {
        return new Response(JSON.stringify({ error: 'Missing priceId' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const sessionPriceId = tierOrPriceId.startsWith('price_')
        ? tierOrPriceId
        : (PRICE_IDS[tierOrPriceId] ?? '');
      if (!sessionPriceId) {
        return new Response(JSON.stringify({ error: 'Invalid price' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const origin = req.headers.get('origin') || 'https://localhost:5173';
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: sessionPriceId, quantity: 1 }],
        success_url: `${origin}/account?success=subscription`,
        cancel_url: `${origin}/account?cancel=1`,
        metadata: { supabase_user_id: user.id },
        subscription_data: { metadata: { supabase_user_id: user.id } },
      });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'payment' && packType) {
      const pack = CREDIT_PACKS[packType];
      if (!pack) {
        return new Response(JSON.stringify({ error: 'Invalid pack type' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const origin = req.headers.get('origin') || 'https://localhost:5173';
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: pack.amount,
            product_data: {
              name: `${pack.credits} ${pack.type === 'generation' ? 'Extra Generations' : 'Staging Credits'}`,
              metadata: { packType, credit_type: pack.type, credits: String(pack.credits) },
            },
          },
          quantity: 1,
        }],
        success_url: `${origin}/account?success=credits`,
        cancel_url: `${origin}/account?cancel=1`,
        metadata: { supabase_user_id: user.id, pack_type: packType, credit_type: pack.type, credits: String(pack.credits) },
      });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid mode or missing priceId/packType' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
