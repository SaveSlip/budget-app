"use client";

import { useState, useEffect, useRef } from "react";
import { User, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "@/hooks/useTheme";

export default function UserNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const userEmail = session?.user?.email ?? "";
  const userName = session?.user?.name ?? "Account";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open user menu"
        aria-expanded={isOpen}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-950 shadow-lg py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {userEmail}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {userName}
            </p>
          </div>

          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Theme
            </p>
            <div className="flex items-center justify-between gap-1 bg-gray-50 dark:bg-gray-900 p-1 rounded-md border border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setTheme("light")}
                aria-label="Light mode"
                className={`flex-1 flex justify-center p-1.5 rounded text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 ${theme === "light" ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900" : ""}`}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme("system")}
                aria-label="System theme"
                className={`flex-1 flex justify-center p-1.5 rounded text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 ${theme === "system" ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900" : ""}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                aria-label="Dark mode"
                className={`flex-1 flex justify-center p-1.5 rounded text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 ${theme === "dark" ? "bg-white dark:bg-gray-800 shadow-sm text-gray-100" : ""}`}
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/signin" })}
            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
