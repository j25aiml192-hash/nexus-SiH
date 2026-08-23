import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNexusStore } from '@/store/nexusStore';
import { SEED_PREDICTIONS } from '@/lib/constants';

export function usePredictions() {
  const { predictions, setPredictions } = useNexusStore();

  useEffect(() => {
    const loadInitial = async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        setPredictions(data as never);
      } else {
        setPredictions(SEED_PREDICTIONS as never);
      }
    };

    loadInitial();

    const channel = supabase
      .channel(`predictions_realtime_${Math.random().toString(36).slice(2, 7)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'predictions' },
        (payload) => {
          if (payload.new) {
            useNexusStore.getState().addPrediction(payload.new as never);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'predictions' },
        (payload) => {
          if (payload.new) {
            useNexusStore.getState().updatePrediction((payload.new as { id: string }).id, payload.new as never);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return predictions;
}
