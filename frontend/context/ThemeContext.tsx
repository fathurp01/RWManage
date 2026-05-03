"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  useEffect,
  type ReactNode,
} from "react";
import { api, getApiError } from "@/lib/axios";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "rwmanage_theme";
const AUTH_STORAGE_KEY = "rwmanage_auth";

const isTheme = (value: unknown): value is Theme => {
  return value === "light" || value === "dark" || value === "system";
};

const readStoredTheme = (defaultTheme: Theme): Theme => {
  if (typeof window === "undefined") {
    return defaultTheme;
  }

  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(raw) ? raw : defaultTheme;
};

const hasStoredToken = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw) as { token?: string };
    return typeof parsed.token === "string" && parsed.token.length > 0;
  } catch {
    return false;
  }
};

const subscribeSystemTheme = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onStoreChange();

  mediaQuery.addEventListener("change", handler);

  return () => {
    mediaQuery.removeEventListener("change", handler);
  };
};

const getSystemThemeSnapshot = (): ResolvedTheme => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getSystemThemeServerSnapshot = (): ResolvedTheme => "light";

const applyThemeToDocument = (resolvedTheme: ResolvedTheme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
};

export const ThemeProvider = ({
  children,
  defaultTheme = "system",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) => {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(defaultTheme));

  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    getSystemThemeServerSnapshot
  );

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const loadPreference = async () => {
      if (!hasStoredToken()) {
        return;
      }

      try {
        const response = await api.get<{ data?: { dark_mode?: boolean } }>("/user/preference");
        const darkMode = response.data.data?.dark_mode;

        if (typeof darkMode === "boolean") {
          const nextTheme: Theme = darkMode ? "dark" : "light";
          setThemeState(nextTheme);
          window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        }
      } catch (error) {
        const apiError = getApiError(error);
        if (apiError.status && apiError.status !== 401 && apiError.status !== 403) {
          console.warn(apiError.message);
        }
      }
    };

    loadPreference().catch(() => undefined);
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    if (hasStoredToken()) {
      void api.patch("/user/preference", {
        dark_mode: nextTheme === "dark",
      }).catch(() => undefined);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      theme,
      resolvedTheme,
      setTheme,
    };
  }, [theme, resolvedTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme harus digunakan di dalam ThemeProvider.");
  }

  return context;
};
