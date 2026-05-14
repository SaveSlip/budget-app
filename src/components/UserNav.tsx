"use client";

import { useState, useEffect, useRef } from "react";
import { User, LogOut, Sun, Moon, Monitor, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useTheme } from "@/hooks/useTheme";
import { UserSwitcher } from "@/components/UserSwitcher";
import type { HouseholdMember } from "@/lib/data/budget";

interface UserNavProps {
  householdName?: string;
  householdMembers?: HouseholdMember[];
}

export default function UserNav({ householdName, householdMembers = [] }: UserNavProps) {
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
        className="flex items-center justify-center w-10 h-10 rounded-full border border-border hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <User className="w-5 h-5 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-popover shadow-lg py-1 z-50">
          <div className="px-4 py-2 border-b border-border">
            <p className="text-sm font-medium text-popover-foreground truncate">
              {userEmail}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {userName}
            </p>
          </div>

          {householdName && householdMembers.length > 0 && (
            <UserSwitcher members={householdMembers} householdName={householdName} />
          )}

          <div className="px-4 py-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Theme
            </p>
            <div className="flex items-center justify-between gap-1 bg-muted p-1 rounded-md border border-border">
              <button
                onClick={() => setTheme("light")}
                aria-label="Light mode"
                className={`flex-1 flex justify-center p-1.5 rounded text-muted-foreground hover:text-foreground ${theme === "light" ? "bg-card shadow-sm text-foreground" : ""}`}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme("system")}
                aria-label="System theme"
                className={`flex-1 flex justify-center p-1.5 rounded text-muted-foreground hover:text-foreground ${theme === "system" ? "bg-card shadow-sm text-foreground" : ""}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                aria-label="Dark mode"
                className={`flex-1 flex justify-center p-1.5 rounded text-muted-foreground hover:text-foreground ${theme === "dark" ? "bg-card shadow-sm text-foreground" : ""}`}
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Link
            href="/dashboard/settings/profile"
            onClick={() => setIsOpen(false)}
            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/signin" })}
            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
