"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/transactions", label: "Transactions", exact: false },
  { href: "/dashboard/settings", label: "Settings", exact: false },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
      {NAV_LINKS.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative text-sm font-semibold transition-colors duration-200",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {/* Active indicator underline */}
            {isActive && (
              <span className="absolute -bottom-1 left-0 w-full h-[2px] rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
