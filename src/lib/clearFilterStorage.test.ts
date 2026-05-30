// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearFilterStorage } from "./clearFilterStorage";

describe("clearFilterStorage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls localStorage.removeItem with the correct key", () => {
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    clearFilterStorage("user-42");
    expect(removeItem).toHaveBeenCalledWith("budgify-filter-user-42");
  });

  it("does nothing when window is undefined (SSR)", () => {
    const original = globalThis.window;
    // @ts-expect-error – simulate SSR environment
    delete globalThis.window;
    expect(() => clearFilterStorage("user-42")).not.toThrow();
    globalThis.window = original;
  });

  it("silently swallows localStorage errors", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => clearFilterStorage("user-1")).not.toThrow();
  });
});
