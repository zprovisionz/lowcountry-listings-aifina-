import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Generation } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useGenerations() {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGenerations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setGenerations(data as Generation[]);
    setLoading(false);
  }, [user]);

  const deleteGeneration = useCallback(async (id: string) => {
    await supabase.from('generations').delete().eq('id', id);
    setGenerations(prev => prev.filter(g => g.id !== id));
  }, []);

  const trackEvent = useCallback(async (
    generationId: string,
    eventType: 'view' | 'copy' | 'download' | 'share'
  ) => {
    if (!user) return;
    await supabase.from('analytics_events').insert({
      user_id: user.id,
      generation_id: generationId,
      event_type: eventType,
    });
  }, [user]);

  return { generations, loading, fetchGenerations, deleteGeneration, trackEvent };
}
