import { describe, it, expect } from "vitest";
import { getInitialTheme } from "./themeUtils";

describe("getInitialTheme (Node/SSR environment)", () => {
  it("returns dark when window is undefined (SSR)", () => {
    const original = (globalThis as any).window;
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    try {
      expect(getInitialTheme()).toBe("dark");
    } finally {
      (globalThis as any).window = original;
    }
  });
});
