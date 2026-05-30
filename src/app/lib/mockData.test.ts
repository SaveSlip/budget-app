import { describe, it, expect } from "vitest";
import {
  categories,
  transactions,
  getTransactionsByCategory,
  getCategoryBreakdown,
} from "./mockData";

describe("getTransactionsByCategory", () => {
  it("returns transactions for an existing category", () => {
    const result = getTransactionsByCategory("groceries");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.categoryId === "groceries")).toBe(true);
  });

  it("returns an empty array for a non-existent category", () => {
    expect(getTransactionsByCategory("nonexistent")).toEqual([]);
  });
});

describe("getCategoryBreakdown", () => {
  it("returns only categories with at least one transaction", () => {
    const breakdown = getCategoryBreakdown();
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown.every((c) => c.amount > 0)).toBe(true);
  });

  it("includes the category id, name, type, and amount fields", () => {
    const breakdown = getCategoryBreakdown();
    for (const item of breakdown) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("type");
      expect(item).toHaveProperty("amount");
    }
  });

  it("correctly sums amounts within each category", () => {
    const breakdown = getCategoryBreakdown();
    for (const item of breakdown) {
      const expected = transactions
        .filter((t) => t.categoryId === item.id)
        .reduce((sum, t) => sum + t.amount, 0);
      expect(item.amount).toBeCloseTo(expected, 5);
    }
  });

  it("does not include categories with zero total", () => {
    const catIds = getCategoryBreakdown().map((c) => c.id);
    const allCatIds = categories.map((c) => c.id);
    const zeroCategories = allCatIds.filter(
      (id) => !transactions.some((t) => t.categoryId === id),
    );
    for (const id of zeroCategories) {
      expect(catIds).not.toContain(id);
    }
  });
});
