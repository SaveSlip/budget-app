"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center justify-center gap-1 bg-muted/50 p-1 rounded-lg border border-border backdrop-blur-sm">
      <button
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        className={`p-1.5 rounded-md transition-all ${theme === "light" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        aria-label="System theme"
        className={`p-1.5 rounded-md transition-all ${theme === "system" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Monitor className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        className={`p-1.5 rounded-md transition-all ${theme === "dark" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}
