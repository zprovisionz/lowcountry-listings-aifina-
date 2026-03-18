import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function useStripe() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createCheckoutSession = useCallback(
    async (mode: 'subscription' | 'payment', priceId?: string, packType?: string) => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast('Please sign in to continue.', 'error');
          return;
        }
        const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode,
            priceId: priceId ?? (mode === 'subscription' ? undefined : null),
            packType: mode === 'payment' ? packType : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast(json.error ?? 'Checkout failed', 'error');
          return;
        }
        if (json.url) {
          window.location.href = json.url;
        } else {
          toast('No checkout URL returned', 'error');
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Checkout failed', 'error');
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const openBillingPortal = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast('Please sign in to continue.', 'error');
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? 'Could not open billing portal', 'error');
        return;
      }
      if (json.url) {
        window.location.href = json.url;
      } else {
        toast('No portal URL returned', 'error');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Portal failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { createCheckoutSession, openBillingPortal, loading };
}
