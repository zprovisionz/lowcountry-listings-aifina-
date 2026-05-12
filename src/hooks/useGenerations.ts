import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Generation } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZE = 50;

export type AnalyticsEventType = 'view' | 'copy' | 'download' | 'share' | 'generate';

export function useGenerations() {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  const fetchGenerations = useCallback(
    async (opts?: { reset?: boolean; append?: boolean }) => {
      if (!user) return;
      const append = opts?.append === true;
      const reset = append ? false : opts?.reset !== false;
      if (reset) {
        offsetRef.current = 0;
      }
      const from = append ? offsetRef.current : 0;
      setLoading(true);
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (!error && data) {
        const rows = data as Generation[];
        if (append && from > 0) {
          setGenerations((prev) => [...prev, ...rows]);
        } else {
          setGenerations(rows);
        }
        offsetRef.current = from + rows.length;
        setHasMore(rows.length === PAGE_SIZE);
      }
      setLoading(false);
    },
    [user]
  );

  const loadMoreGenerations = useCallback(async () => {
    if (!user || !hasMore || loading) return;
    await fetchGenerations({ reset: false, append: true });
  }, [user, hasMore, loading, fetchGenerations]);

  const deleteGeneration = useCallback(async (id: string) => {
    await supabase.from('generations').delete().eq('id', id);
    setGenerations((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const trackEvent = useCallback(
    async (
      generationId: string,
      eventType: AnalyticsEventType,
      metadata?: Record<string, unknown> | null
    ) => {
      if (!user) return;
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        generation_id: generationId,
        event_type: eventType,
        metadata: metadata ?? null,
      });
    },
    [user]
  );

  return {
    generations,
    loading,
    hasMore,
    fetchGenerations,
    loadMoreGenerations,
    deleteGeneration,
    trackEvent,
  };
}
