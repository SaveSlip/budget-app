import { describe, it, expect } from "vitest";
import { monthToQuarter, computeCategorySpending } from "./budgetUtils";
import type { Transaction } from "./data/budget";

describe("monthToQuarter", () => {
  it.each([
    ["2026-01", "2026-Q1"],
    ["2026-02", "2026-Q1"],
    ["2026-03", "2026-Q1"],
    ["2026-04", "2026-Q2"],
    ["2026-05", "2026-Q2"],
    ["2026-06", "2026-Q2"],
    ["2026-07", "2026-Q3"],
    ["2026-08", "2026-Q3"],
    ["2026-09", "2026-Q3"],
    ["2026-10", "2026-Q4"],
    ["2026-11", "2026-Q4"],
    ["2026-12", "2026-Q4"],
  ])("maps %s → %s", (month, expected) => {
    expect(monthToQuarter(month)).toBe(expected);
  });

  it("handles year boundary correctly", () => {
    expect(monthToQuarter("2025-12")).toBe("2025-Q4");
    expect(monthToQuarter("2025-01")).toBe("2025-Q1");
  });
});

const makeTx = (overrides: Partial<Transaction>): Transaction => ({
  pk: "USER#test",
  sk: "TX#2026-05-01#0#abc",
  id: "abc",
  description: "Test",
  amount: 100,
  date: "2026-05-01",
  category: "Food",
  type: "TRANSACTION",
  transactionType: "EXPENSE",
  createdAt: "2026-05-01T00:00:00.000Z",
  ...overrides,
});

describe("computeCategorySpending", () => {
  it("sums expenses per category", () => {
    const txns: Transaction[] = [
      makeTx({ category: "Food", amount: 50 }),
      makeTx({ category: "Food", amount: 30 }),
      makeTx({ category: "Transport", amount: 20 }),
    ];
    expect(computeCategorySpending(txns)).toEqual({ Food: 80, Transport: 20 });
  });

  it("excludes INCOME transactions", () => {
    const txns: Transaction[] = [
      makeTx({ category: "Salary", amount: 5000, transactionType: "INCOME" }),
      makeTx({ category: "Food", amount: 40 }),
    ];
    expect(computeCategorySpending(txns)).toEqual({ Food: 40 });
  });

  it("takes absolute value of negative amounts", () => {
    const txns: Transaction[] = [makeTx({ category: "Bills", amount: -150 })];
    expect(computeCategorySpending(txns)).toEqual({ Bills: 150 });
  });

  it("treats a non-numeric amount as 0", () => {
    const txns: Transaction[] = [makeTx({ category: "Misc", amount: NaN })];
    expect(computeCategorySpending(txns)).toEqual({ Misc: 0 });
  });

  it("returns empty object for an empty list", () => {
    expect(computeCategorySpending([])).toEqual({});
  });

  it("ignores transactions without a category", () => {
    const txns: Transaction[] = [makeTx({ category: "" })];
    expect(computeCategorySpending(txns)).toEqual({});
  });

  it("excludes transactions where transactionType is undefined (not assumed EXPENSE)", () => {
    const txns: Transaction[] = [makeTx({ transactionType: undefined, category: "Misc", amount: 10 })];
    expect(computeCategorySpending(txns)).toEqual({});
  });
});
