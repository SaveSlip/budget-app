// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "./Breadcrumbs";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { usePathname } from "next/navigation";
const mockPathname = vi.mocked(usePathname);

describe("Breadcrumbs", () => {
  it("renders nothing when at root or single segment", () => {
    mockPathname.mockReturnValue("/dashboard");
    const { container } = render(<Breadcrumbs />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when non-linkable segments reduce visibles to one", () => {
    // /dashboard/settings — 'settings' is non-linkable so only 'dashboard' remains
    mockPathname.mockReturnValue("/dashboard/settings");
    const { container } = render(<Breadcrumbs />);
    expect(container.firstChild).toBeNull();
  });

  it("renders breadcrumbs for /dashboard/transactions", () => {
    mockPathname.mockReturnValue("/dashboard/transactions");
    render(<Breadcrumbs />);
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Transactions")).toBeTruthy();
  });

  it("renders the last segment as plain text (not a link)", () => {
    mockPathname.mockReturnValue("/dashboard/transactions");
    render(<Breadcrumbs />);
    const lastCrumb = screen.getByText("Transactions");
    expect(lastCrumb.tagName).toBe("SPAN");
  });

  it("renders parent segments as links", () => {
    mockPathname.mockReturnValue("/dashboard/transactions");
    render(<Breadcrumbs />);
    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link.getAttribute("href")).toBe("/dashboard");
  });

  it("uses PATH_LABELS mapping for known segments", () => {
    mockPathname.mockReturnValue("/dashboard/settings/categories");
    render(<Breadcrumbs />);
    expect(screen.getByText("Category Configuration")).toBeTruthy();
  });

  it("falls back to raw segment when no label defined", () => {
    mockPathname.mockReturnValue("/dashboard/accounts");
    render(<Breadcrumbs />);
    expect(screen.getByText("accounts")).toBeTruthy();
  });
});
