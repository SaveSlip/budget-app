"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "budgify-theme";
type Theme = "light" | "dark" | "system";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable (e.g. private browsing restrictions)
  }
  return "dark";
}

export function useTheme() {
  // Lazy initializer reads localStorage so the first render matches
  // the class already applied by the blocking script in layout.tsx,
  // preventing a hydration mismatch and the associated theme flash.
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Silently ignore write failures.
    }
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

  return { theme, setTheme };
}
