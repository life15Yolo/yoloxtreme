'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Designer } from '@/lib/types';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  designer: Designer | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  designer: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        const { data: designerData } = await supabase.from('designers').select('*').eq('id', data.session.user.id).maybeSingle();
        if (mounted) setDesigner(designerData as Designer | null);
      }
      if (mounted) setLoading(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const { data: designerData } = await supabase.from('designers').select('*').eq('id', newSession.user.id).maybeSingle();
          setDesigner(designerData as Designer | null);
        } else { setDesigner(null); }
        setLoading(false);
      })();
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null); setUser(null); setDesigner(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, designer, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
