import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { backend } from "../services/backend";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    backend
      .getProfile()
      .then((p) => active && setUser(p))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    const unsubscribe = backend.onAuthChange((p) => {
      if (!active) return;
      setUser(p);
      setLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      mode: backend.mode,
      signOut: () => backend.signOut(),
      updateProfile: async (patch) => {
        const p = await backend.updateProfile(patch);
        setUser(p);
        return p;
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
