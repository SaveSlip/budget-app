// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Providers, ThemeContext } from "./providers";
import { useContext } from "react";

function ThemeConsumer() {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme("light")}>light</button>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("system")}>system</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  if ("matchMedia" in window) {
    Object.defineProperty(window, "matchMedia", { writable: true, value: undefined });
  }
});


describe("Providers / ThemeProvider", () => {
  it("renders children", () => {
    render(<Providers><span>hello</span></Providers>);
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("applies dark class to root by default", async () => {
    await act(async () => {
      render(<Providers><ThemeConsumer /></Providers>);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("reads stored theme from localStorage on mount", async () => {
    localStorage.setItem("budgify-theme", "light");
    await act(async () => {
      render(<Providers><ThemeConsumer /></Providers>);
    });
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("setTheme updates the theme and persists to localStorage", async () => {
    await act(async () => {
      render(<Providers><ThemeConsumer /></Providers>);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("light"));
    });
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem("budgify-theme")).toBe("light");
  });

  it("setTheme to system: dark OS preference applies dark class and cleans up on unmount", async () => {
    const removeEventListener = vi.fn();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener,
      }),
    });
    let unmount: () => void;
    await act(async () => {
      const result = render(<Providers><ThemeConsumer /></Providers>);
      unmount = result.unmount;
    });
    await act(async () => { fireEvent.click(screen.getByText("system")); });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await act(async () => { unmount(); });
    expect(removeEventListener).toHaveBeenCalled();
  });

  it("setTheme to system: light OS preference applies light class", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    await act(async () => {
      render(<Providers><ThemeConsumer /></Providers>);
    });
    await act(async () => { fireEvent.click(screen.getByText("system")); });
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("system theme: apply callback is invoked when OS preference changes", async () => {
    let capturedListener: ((e: MediaQueryListEvent) => void) | null = null;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: (_event: string, fn: (e: MediaQueryListEvent) => void) => { capturedListener = fn; },
        removeEventListener: vi.fn(),
      }),
    });
    await act(async () => {
      render(<Providers><ThemeConsumer /></Providers>);
    });
    await act(async () => { fireEvent.click(screen.getByText("system")); });
    // Simulate OS preference change to dark
    await act(async () => {
      capturedListener?.({ matches: true } as MediaQueryListEvent);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    // Simulate change back to light
    await act(async () => {
      capturedListener?.({ matches: false } as MediaQueryListEvent);
    });
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("falls back to dark when localStorage has an invalid theme value", async () => {
    localStorage.setItem("budgify-theme", "rainbow");
    await act(async () => {
      render(<Providers><ThemeConsumer /></Providers>);
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setTheme silently swallows localStorage errors", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceeded"); });
    try {
      await act(async () => {
        render(<Providers><ThemeConsumer /></Providers>);
      });
      await act(async () => {
        fireEvent.click(screen.getByText("light"));
      });
      expect(document.documentElement.classList.contains("light")).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it("removes theme class when switching themes", async () => {
    localStorage.setItem("budgify-theme", "light");
    await act(async () => {
      render(<Providers><ThemeConsumer /></Providers>);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("dark"));
    });
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
