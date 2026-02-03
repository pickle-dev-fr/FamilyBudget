import { createContext, useContext, useEffect, useState } from "react";
import { getToken, clearToken } from "@/api/token";
import { me } from "@/api/auth.api";

type AuthContextType = {
  loading: boolean;
  authenticated: boolean;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  async function refreshAuth() {
    const token = getToken();

    if (!token) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }

    try {
      await me(); // HEAD /auth/me
      setAuthenticated(true);
    } catch {
      clearToken();
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ loading, authenticated, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
