import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNexusStore } from '@/store/nexusStore';

export function useAuth() {
  const { user, setUser, clearStore } = useNexusStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data?.session?.user) {
        await fetchUserProfile(data.session.user.id, data.session.user.email || '');
      }
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          await fetchUserProfile(session.user.id, session.user.email || '');
        } else {
          clearStore();
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserProfile = async (authId: string, email: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authId)
      .maybeSingle();

    if (error || !data) {
      setUser({
        id: authId,
        email,
        name: 'Unknown User',
        role: 'i4c_national',
        state: null,
        district: null,
        bank: null,
        phone: null,
      });
      return;
    }

    setUser({
      id: data.id,
      email,
      name: data.name,
      role: data.role,
      state: data.state,
      district: data.district,
      bank: data.bank,
      phone: data.phone,
    });
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearStore();
  }, [clearStore]);

  return { user, loading, signIn, signOut };
}
