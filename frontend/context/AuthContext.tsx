"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type AuthUser,
  AUTH_ROLE_COOKIE,
  AUTH_STATUS_COOKIE,
  setClientCookie,
  deleteClientCookie,
} from "@/lib/auth";
import { api } from "@/lib/axios";

interface AuthContextValue {
  user: AuthUser | null;
  role: AuthUser["role"] | null;
  statusAkun: AuthUser["status_akun"] | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    const hydrate = async () => {
      try {
        const response = await api.get<{ data: { user: AuthUser } }>("/auth/me");
        const nextUser = response.data?.data?.user ?? null;
        if (isActive) {
          setUser(nextUser);
        }
      } catch {
        if (isActive) {
          setUser(null);
        }
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    };

    hydrate();
    return () => {
      isActive = false;
    };
  }, []);

  // Sync role & status cookies so server-side layout renders the correct sidebar
  useEffect(() => {
    if (user) {
      setClientCookie(AUTH_ROLE_COOKIE, user.role);
      setClientCookie(AUTH_STATUS_COOKIE, user.status_akun);
    } else if (isHydrated) {
      deleteClientCookie(AUTH_ROLE_COOKIE);
      deleteClientCookie(AUTH_STATUS_COOKIE);
    }
  }, [user, isHydrated]);

  const refreshSession = useCallback(async () => {
    const response = await api.get<{ data: { user: AuthUser } }>("/auth/me");
    setUser(response.data?.data?.user ?? null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      role: user?.role ?? null,
      statusAkun: user?.status_akun ?? null,
      isAuthenticated: Boolean(user),
      isHydrated,
      setUser,
      refreshSession,
      logout,
    };
  }, [user, isHydrated, refreshSession, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    return {
      user: null,
      role: null,
      statusAkun: null,
      isAuthenticated: false,
      isHydrated: false,
      setUser: () => {},
      refreshSession: async () => {},
      logout: async () => {},
    };
  }

  return context;
};
