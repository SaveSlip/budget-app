import { describe, it, expect } from "vitest";
import { normalizeDesc, fuzzyMatch } from "./transactionUtils";

describe("normalizeDesc", () => {
  it("lowercases the string", () => {
    expect(normalizeDesc("STARBUCKS")).toBe("starbucks");
  });

  it("collapses multiple spaces to one", () => {
    expect(normalizeDesc("Tim   Hortons")).toBe("tim hortons");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeDesc("  Netflix  ")).toBe("netflix");
  });

  it("collapses internal spaces and lowercases", () => {
    expect(normalizeDesc("  Amazon  PRIME  ")).toBe("amazon prime");
  });
});

describe("fuzzyMatch", () => {
  it("matches identical strings", () => {
    expect(fuzzyMatch("starbucks", "starbucks")).toBe(true);
  });

  it("matches regardless of casing", () => {
    expect(fuzzyMatch("Starbucks", "STARBUCKS")).toBe(true);
  });

  it("matches when one string contains the other", () => {
    expect(fuzzyMatch("starbucks coffee", "starbucks")).toBe(true);
  });

  it("matches reverse containment", () => {
    expect(fuzzyMatch("amazon", "amazon prime")).toBe(true);
  });

  it("does not match completely different strings", () => {
    expect(fuzzyMatch("netflix", "starbucks")).toBe(false);
  });

  it("handles extra whitespace gracefully", () => {
    expect(fuzzyMatch("  Netflix  ", "netflix")).toBe(true);
  });

  it("matches partial description with different casing", () => {
    expect(fuzzyMatch("Tim Hortons #45", "tim hortons")).toBe(true);
  });
});
