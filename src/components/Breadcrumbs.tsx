"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PATH_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  settings: "Settings",
  categories: "Category Configuration",
};

/**
 * Segments that have no routable page and must not render as links.
 * This prevents dead links that produce 404 responses.
 */
const NON_LINKABLE_SEGMENTS = new Set(["settings"]);

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  // Strip out segments that have no routable page so they never appear in the trail.
  const visibleSegments = segments.filter(
    (seg) => !NON_LINKABLE_SEGMENTS.has(seg),
  );

  if (visibleSegments.length <= 1) return null;

  const crumbs = visibleSegments.map((seg, i) => ({
    label: PATH_LABELS[seg] ?? seg,
    href: "/" + segments.slice(0, segments.indexOf(seg) + 1).join("/"),
    isLast: i === visibleSegments.length - 1,
  }));

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-muted-foreground/30 select-none">·</span>
          )}
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
