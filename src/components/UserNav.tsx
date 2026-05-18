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
  const { data: session, update } = useSession();
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

  const activeUserId = session?.user?.activeUserId;
  const ownId = session?.user?.id;
  const activeMember = activeUserId && activeUserId !== ownId
    ? householdMembers.find((m) => m.id === activeUserId)
    : null;

  const handleSwitchToSelf = async () => {
    await update({ activeUserId: ownId });
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-center gap-2" ref={menuRef}>
      {activeMember && (
        <span className="text-xs font-medium text-primary hidden sm:block">
          {activeMember.name}
        </span>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open user menu"
        aria-expanded={isOpen}
        className={`flex items-center justify-center w-10 h-10 rounded-full border hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${activeMember ? "border-primary" : "border-border"}`}
      >
        <User className={`w-5 h-5 ${activeMember ? "text-primary" : "text-muted-foreground"}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-60 rounded-xl border border-border bg-popover shadow-xl py-1 z-50">
          {/* Header — acts as "Me" identity card; clickable to switch back when viewing another member */}
          <button
            onClick={activeMember ? handleSwitchToSelf : undefined}
            disabled={!activeMember}
            className={`w-full px-4 py-4 border-b border-border flex flex-col items-center gap-2 transition-colors ${activeMember ? "hover:bg-accent cursor-pointer" : "cursor-default"}`}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${activeMember ? "bg-muted border border-border" : "bg-primary/10 border border-primary/20"}`}>
              <User className={`w-5 h-5 ${activeMember ? "text-muted-foreground" : "text-primary"}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-popover-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground truncate max-w-50">{userEmail}</p>
              {activeMember && (
                <p className="text-xs text-primary mt-0.5">Switch back to me</p>
              )}
            </div>
          </button>

          {householdName && householdMembers.length > 0 && (
            <UserSwitcher
              members={householdMembers}
              householdName={householdName}
              canViewHousehold={session?.user?.role === "MASTER" || !!session?.user?.canViewHousehold}
              onClose={() => setIsOpen(false)}
            />
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
