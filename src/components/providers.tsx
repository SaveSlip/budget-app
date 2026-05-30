"use client";

import { createContext, useState, useEffect, useContext } from "react";
import { SessionProvider } from "next-auth/react";
import { getInitialTheme } from "@/lib/themeUtils";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "budgify-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
});

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // Sync from localStorage after hydration — useState initializer runs on the
  // server where window is undefined, so we always start with "dark" and
  // correct it client-side to avoid a stale active-button state.
  useEffect(() => {
    setThemeState(getInitialTheme());
  }, []);

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    setThemeState(next);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = (e: MediaQueryListEvent | MediaQueryList) => {
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
      };
      apply(mql);
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  );
}
