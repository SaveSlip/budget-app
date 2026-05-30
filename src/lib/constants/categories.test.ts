import { describe, it, expect } from "vitest";
import {
  findUniversalCategory,
  applyUserRules,
  autoMatchCategory,
  UNIVERSAL_CATEGORIES,
  UNIVERSAL_INCOME_CATEGORIES,
} from "./categories";

describe("findUniversalCategory", () => {
  it("finds a category by an exact keyword", () => {
    const result = findUniversalCategory("netflix subscription");
    expect(result?.id).toBe("subscriptions");
  });

  it("returns undefined for an unknown description", () => {
    expect(findUniversalCategory("xyzzy unknown vendor")).toBeUndefined();
  });

  it("matches case-insensitively", () => {
    expect(findUniversalCategory("RENT PAYMENT")).toBeDefined();
  });

  it("matches when the category name itself is a substring of the query", () => {
    expect(findUniversalCategory("amazon")).toBeDefined();
  });
});

describe("applyUserRules", () => {
  const rules = [
    { merchantKeyword: "starbucks", categoryName: "Coffee", transactionType: "EXPENSE" },
    { merchantKeyword: "salary", categoryName: "Salary", transactionType: "INCOME" },
  ];

  it("matches a rule by merchant keyword and type", () => {
    expect(applyUserRules("Starbucks #45", "EXPENSE", rules)).toBe("Coffee");
  });

  it("returns null when no rule matches", () => {
    expect(applyUserRules("Unknown Vendor", "EXPENSE", rules)).toBeNull();
  });

  it("does not match when transactionType differs", () => {
    expect(applyUserRules("starbucks", "INCOME", rules)).toBeNull();
  });

  it("returns null for an empty rules list", () => {
    expect(applyUserRules("Starbucks", "EXPENSE", [])).toBeNull();
  });
});

describe("autoMatchCategory", () => {
  it("matches an expense keyword", () => {
    expect(autoMatchCategory("Netflix monthly", "EXPENSE")).toBe("Subscriptions");
  });

  it("returns Uncategorized for an unknown expense", () => {
    expect(autoMatchCategory("xyzzy unknown", "EXPENSE")).toBe("Uncategorized");
  });

  it("matches an income keyword", () => {
    expect(autoMatchCategory("payroll deposit", "INCOME")).toBe("Salary");
  });

  it("returns Uncategorized for an unknown income", () => {
    expect(autoMatchCategory("mystery credit", "INCOME")).toBe("Uncategorized");
  });

  it("searches INCOME pool when transactionType is INCOME", () => {
    const result = autoMatchCategory("freelance invoice payment", "INCOME");
    expect(result).toBe("Freelance");
  });

  it("searches EXPENSE pool when transactionType is EXPENSE", () => {
    const result = autoMatchCategory("uber ride", "EXPENSE");
    expect(result).toBe("Transportation");
  });
});

describe("category constants", () => {
  it("UNIVERSAL_CATEGORIES is non-empty", () => {
    expect(UNIVERSAL_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("UNIVERSAL_INCOME_CATEGORIES is non-empty", () => {
    expect(UNIVERSAL_INCOME_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("every universal category has an id, name, and non-empty keywords", () => {
    for (const cat of [...UNIVERSAL_CATEGORIES, ...UNIVERSAL_INCOME_CATEGORIES]) {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(cat.keywords.length).toBeGreaterThan(0);
    }
  });
});
