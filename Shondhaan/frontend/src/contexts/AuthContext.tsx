import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearMySqlAuth, getMySqlAuth } from "@/lib/mysqlAuth";
import type { MySqlAuthUser } from "@/lib/mysqlAuth"; // adjust path

interface AuthContextType {
  user: MySqlAuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MySqlAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncMySqlUser = () => {
      const auth = getMySqlAuth();

      if (auth?.user) {
        setUser(auth.user);
        setLoading(false);
        return;
      }

      setUser(null);
      setLoading(false);
    };

    const handleChange = () => syncMySqlUser();

    window.addEventListener("yess-mysql-auth-changed", handleChange);

    syncMySqlUser();

    return () => {
      window.removeEventListener("yess-mysql-auth-changed", handleChange);
    };
  }, []);

  const signOut = async () => {
    clearMySqlAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};