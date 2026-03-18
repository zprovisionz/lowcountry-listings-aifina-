// supabase/functions/stripe-webhook/index.ts
// Handles Stripe webhooks: subscription lifecycle + payment_intent.succeeded for credit packs.
// Required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const TIER_FROM_PRICE_ID: Record<string, string> = {
  [Deno.env.get('STRIPE_STARTER_PRICE_ID') ?? '']: 'starter',
  [Deno.env.get('STRIPE_PRO_PRICE_ID') ?? '']: 'pro',
  [Deno.env.get('STRIPE_PRO_PLUS_PRICE_ID') ?? '']: 'pro_plus',
  [Deno.env.get('STRIPE_TEAM_PRICE_ID') ?? '']: 'team',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) {
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

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'No signature' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata as Record<string, string>)?.supabase_user_id;
        if (!userId) break;

        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = (priceId && TIER_FROM_PRICE_ID[priceId]) ? TIER_FROM_PRICE_ID[priceId] : 'free';
        const status = sub.status;

        await supabase.from('profiles').update({
          stripe_subscription_id: sub.id,
          subscription_status: status,
        }).eq('id', userId);
        await supabase.rpc('apply_tier_limits', { p_user_id: userId, p_tier: tier });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata as Record<string, string>)?.supabase_user_id;
        if (!userId) break;

        await supabase.from('profiles').update({
          stripe_subscription_id: null,
          subscription_status: 'canceled',
          tier: 'free',
          generations_limit: 10,
          staging_credits_limit: 0,
        }).eq('id', userId);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment' && session.metadata) {
          const meta = session.metadata as Record<string, string>;
          const userId = meta.supabase_user_id;
          const creditType = meta.credit_type;
          const credits = parseInt(meta.credits ?? '0', 10);
          if (!userId || !creditType || !credits) break;

          if (creditType === 'generation') {
            const { data: row } = await supabase.from('profiles').select('extra_gen_credits').eq('id', userId).single();
            await supabase.from('profiles').update({ extra_gen_credits: (row?.extra_gen_credits ?? 0) + credits }).eq('id', userId);
          } else {
            const { data: row } = await supabase.from('profiles').select('extra_staging_credits').eq('id', userId).single();
            await supabase.from('profiles').update({ extra_staging_credits: (row?.extra_staging_credits ?? 0) + credits }).eq('id', userId);
          }

          await supabase.from('credit_purchases').insert({
            user_id: userId,
            stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            credit_type: creditType,
            credits_purchased: credits,
            amount_cents: session.amount_total ?? 0,
          });
        }
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook handler failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
