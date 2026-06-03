import { describe, it, expect } from "vitest";
import { normalizeDesc, fuzzyMatch, extractMerchant } from "./transactionUtils";

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

describe("extractMerchant", () => {
  it("strips bank prefix and reference number", () => {
    expect(extractMerchant("CONTACTLESS INTERAC PURCHASE - 6985 SWAGAT INDIAN S")).toBe("swagat indian s");
  });

  it("produces the same merchant key for different reference numbers", () => {
    expect(extractMerchant("CONTACTLESS INTERAC PURCHASE - 6985 SWAGAT INDIAN S")).toBe(
      extractMerchant("CONTACTLESS INTERAC PURCHASE - 6749 SWAGAT INDIAN S"),
    );
  });

  it("strips bank prefix with no reference number", () => {
    expect(extractMerchant("ONLINE BANKING PAYMENT - NETFLIX")).toBe("netflix");
  });

  it("returns the description as-is when there is no dash separator", () => {
    expect(extractMerchant("COFFEE SHOP ON MAIN")).toBe("coffee shop on main");
  });

  it("handles descriptions with multiple dashes by using the last one", () => {
    expect(extractMerchant("PURCHASE - SOME STORE - 1234 ACTUAL MERCHANT")).toBe("actual merchant");
  });
});
