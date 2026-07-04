import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { clearMySqlAuth, getMySqlAuth } from "@/lib/mysqlAuth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncMySqlUser = () => {
      const auth = getMySqlAuth();
      if (auth?.user) {
        setUser(auth.user as unknown as User);
        setSession(null);
        setLoading(false);
        return true;
      }
      return false;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (getMySqlAuth()) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (syncMySqlUser()) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const handleMySqlAuthChanged = () => {
      if (syncMySqlUser()) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
    };

    window.addEventListener("yess-mysql-auth-changed", handleMySqlAuthChanged);
    syncMySqlUser();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("yess-mysql-auth-changed", handleMySqlAuthChanged);
    };
  }, []);

  const signOut = async () => {
    clearMySqlAuth();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
