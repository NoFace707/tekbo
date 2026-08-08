import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  clearSession,
  getCurrentUser,
  getStoredSessionUser,
  isAdmin,
  isSupervisor,
  isVendedor,
  loginUser as apiLoginUser,
  logoutUser as apiLogoutUser,
  saveSession,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredSessionUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((data) => {
        if (!mounted) return;
        saveSession({ user: data });
        setUser(data);
      })
      .catch(() => {
        if (!mounted) return;
        clearSession();
        setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await apiLoginUser(credentials);
    saveSession({ user: data.user, tokens: data.tokens });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogoutUser();
    } catch {
      // noop
    }
    clearSession();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin: isAdmin(user),
    isSupervisor: isSupervisor(user),
    isVendedor: isVendedor(user),
    isAuthenticated: Boolean(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
