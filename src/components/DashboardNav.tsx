"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/transactions", label: "Transactions", exact: false },
  { href: "/dashboard/accounts", label: "Accounts", exact: false },
  { href: "/dashboard/benchmarking", label: "Benchmarking", exact: false },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildHref(base: string): string {
    const params = new URLSearchParams();
    const view = searchParams.get("view");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    if (view) params.set("view", view);
    if (month) params.set("month", month);
    if (year) params.set("year", year);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  const handleMouseEnter = (href: string, exact: boolean) => {
    if (exact ? pathname === href : pathname.startsWith(href)) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    hoverTimer.current = setTimeout(() => router.push(buildHref(href)), 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  return (
    <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
      {NAV_LINKS.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={buildHref(href)}
            onMouseEnter={() => handleMouseEnter(href, exact)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => {
              if (exact ? pathname === href : pathname.startsWith(href)) e.preventDefault();
            }}
            className={cn(
              "relative group text-sm font-semibold transition-colors duration-200",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            <span
              className={cn(
                "absolute -bottom-1 left-0 w-full h-0.5 rounded-full bg-primary transition-opacity duration-200",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function buildHref(base: string): string {
    const params = new URLSearchParams();
    const view = searchParams.get("view");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    if (view) params.set("view", view);
    if (month) params.set("month", month);
    if (year) params.set("year", year);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

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

  return (
    <div className="relative md:hidden" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-border hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Menu className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-48 rounded-xl border border-border bg-popover shadow-xl py-2 z-50">
          {NAV_LINKS.map(({ href, label, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={buildHref(href)}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block px-4 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
