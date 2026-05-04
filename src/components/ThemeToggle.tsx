"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center justify-center gap-1 bg-gray-100/50 dark:bg-gray-900/50 p-1 rounded-lg border border-gray-200 dark:border-gray-800 backdrop-blur-sm">
      <button
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        className={`p-1.5 rounded-md transition-all ${theme === "light" ? "bg-white dark:bg-gray-800 shadow-sm text-orange-600" : "text-gray-500 hover:text-gray-900"}`}
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        aria-label="System theme"
        className={`p-1.5 rounded-md transition-all ${theme === "system" ? "bg-white dark:bg-gray-800 shadow-sm text-orange-600" : "text-gray-500 hover:text-gray-900"}`}
      >
        <Monitor className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        className={`p-1.5 rounded-md transition-all ${theme === "dark" ? "bg-white dark:bg-gray-800 shadow-sm text-orange-600" : "text-gray-500 hover:text-gray-900"}`}
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}
