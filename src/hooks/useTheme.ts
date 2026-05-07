"use client";

import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");

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
