import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

      setUser(null);
      setSession(null);
      setLoading(false);
      return false;
    };

    const handleMySqlAuthChanged = () => {
      syncMySqlUser();
    };

    window.addEventListener("yess-mysql-auth-changed", handleMySqlAuthChanged);
    syncMySqlUser();

    return () => {
      window.removeEventListener("yess-mysql-auth-changed", handleMySqlAuthChanged);
    };
  }, []);

  const signOut = async () => {
    clearMySqlAuth();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
