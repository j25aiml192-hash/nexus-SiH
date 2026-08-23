import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNexusStore } from '@/store/nexusStore';
import { SEED_ALERTS } from '@/lib/constants';

export function useAlerts() {
  const { alerts, setAlerts } = useNexusStore();

  useEffect(() => {
    const loadInitial = async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        setAlerts(data as never);
      } else {
        setAlerts(SEED_ALERTS as never);
      }
    };

    loadInitial();

    const channel = supabase
      .channel(`alerts_realtime_${Math.random().toString(36).slice(2, 7)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          if (payload.new) {
            useNexusStore.getState().addAlert(payload.new as never);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);

    if (!error) {
      useNexusStore.setState((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === alertId
            ? { ...a, status: 'acknowledged', acknowledged_at: new Date().toISOString() }
            : a
        ),
      }));
    }
  }, []);

  return { alerts, acknowledgeAlert };
}
