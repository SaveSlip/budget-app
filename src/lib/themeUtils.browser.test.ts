// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getInitialTheme } from "./themeUtils";

describe("getInitialTheme (browser/jsdom)", () => {
  beforeEach(() => localStorage.clear());

  it("returns dark when nothing is stored", () => {
    expect(getInitialTheme()).toBe("dark");
  });

  it("returns the stored theme when valid", () => {
    localStorage.setItem("budgify-theme", "light");
    expect(getInitialTheme()).toBe("light");
  });

  it("returns dark for an invalid stored value", () => {
    localStorage.setItem("budgify-theme", "rainbow");
    expect(getInitialTheme()).toBe("dark");
  });

  it("returns dark when localStorage.getItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("QuotaExceeded"); });
    try {
      expect(getInitialTheme()).toBe("dark");
    } finally {
      spy.mockRestore();
    }
  });
});
