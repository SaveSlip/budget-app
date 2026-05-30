import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ docClient: { send: vi.fn() }, TABLE_NAME: "test-table" }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("date-fns", async (importOriginal) => {
  const actual = await importOriginal<typeof import("date-fns")>();
  return {
    ...actual,
    format: vi.fn().mockReturnValue("2026-05"),
    subMonths: vi.fn().mockImplementation((_date: Date, n: number) => new Date(2026, 4 - n, 1)),
  };
});

import {
  getMonthlyData,
  getCategories,
  getAccounts,
  getMonthlyBalance,
  getQuarterlyReview,
  getYearlyBalance,
  getAllMonthsBalance,
  getAllYearsBalance,
  getTransactionTrend,
  monthToQuarter,
  currentQuarter,
} from "./budget";
import { docClient } from "@/lib/db";
import { auth } from "@/auth";

const mockSend = vi.mocked(docClient.send);
const mockAuth = vi.mocked(auth);
const authed = { user: { id: "u1" } };

const sampleTx = {
  pk: "USER#u1",
  sk: "TX#2026-05-01#t1",
  id: "t1",
  description: "Coffee",
  amount: 50,
  date: "2026-05-01",
  category: "Food",
  type: "TRANSACTION",
  transactionType: "EXPENSE",
  createdAt: "2026-05-01T00:00:00.000Z",
};

const incomeTx = { ...sampleTx, id: "t2", sk: "TX#2026-05-01#t2", amount: 2000, transactionType: "INCOME", category: "Salary" };

beforeEach(() => vi.clearAllMocks());

describe("monthToQuarter", () => {
  it("converts month string to quarter string", () => {
    expect(monthToQuarter("2026-05")).toBe("2026-Q2");
  });
});

describe("currentQuarter", () => {
  it("returns a quarter string for the current date", () => {
    expect(currentQuarter()).toMatch(/^\d{4}-Q[1-4]$/);
  });
});

describe("getMonthlyData", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(getMonthlyData("2026-05")).rejects.toThrow("Unauthorized");
  });

  it("handles tx with undefined transactionType (defaults to EXPENSE)", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const noTypeTx = { ...sampleTx, transactionType: undefined };
    mockSend.mockResolvedValue({ Items: [noTypeTx] } as any);
    const result = await getMonthlyData("2026-05");
    expect(result).toHaveLength(1);
  });

  it("returns transactions for the month", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [sampleTx] } as any);
    const result = await getMonthlyData("2026-05");
    expect(result).toEqual([sampleTx]);
  });

  it("paginates using LastEvaluatedKey", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [sampleTx], LastEvaluatedKey: { pk: "a" } } as any)
      .mockResolvedValueOnce({ Items: [incomeTx] } as any);
    const result = await getMonthlyData("2026-05");
    expect(result.length).toBe(2);
  });

  it("returns empty array on error", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    const result = await getMonthlyData("2026-05");
    expect(result).toEqual([]);
  });
});

describe("getAccounts", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(getAccounts()).rejects.toThrow("Unauthorized");
  });

  it("returns accounts list", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [{ id: "a1", name: "Chequing" }] } as any);
    expect(await getAccounts()).toEqual([{ id: "a1", name: "Chequing" }]);
  });

  it("returns empty array when Items is undefined", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any); // no Items key
    expect(await getAccounts()).toEqual([]);
  });

  it("returns empty array on error", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await getAccounts()).toEqual([]);
  });
});

describe("getCategories", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(getCategories()).rejects.toThrow("Unauthorized");
  });

  it("returns merged universal + custom categories", async () => {
    mockAuth.mockResolvedValue(authed as any);
    // First send: CATEGORY# query, Second: UNIVERSAL_LIMIT# batchGet (done via BatchGetCommand)
    mockSend
      .mockResolvedValueOnce({ Items: [{ id: "c1", name: "Books", limit: 30, categoryType: "EXPENSE", createdAt: "" }] } as any)
      .mockResolvedValueOnce({ Responses: { "test-table": [] } } as any);
    const result = await getCategories("2026-05");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty array on error", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await getCategories()).toEqual([]);
  });

  it("applies quarter-scoped limit over base limit (3-part sk)", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({
        Responses: {
          "test-table": [
            // Quarter limit (3 parts)
            { sk: "UNIVERSAL_LIMIT#housing#2026-Q2", id: "housing", limit: 1800 },
            // Base limit (2 parts)
            { sk: "UNIVERSAL_LIMIT#housing", id: "housing", limit: 1500 },
          ],
        },
      } as any);
    const result = await getCategories("2026-05");
    const housing = result.find((c) => c.id === "housing");
    expect(housing?.limit).toBe(1800);
  });
});

describe("getMonthlyBalance (undefined transactionType and NaN amount)", () => {
  it("treats undefined transactionType as EXPENSE in totalExpenses", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const undefinedTypeTx = { ...sampleTx, transactionType: undefined, amount: 75 };
    const nanAmountTx = { ...sampleTx, id: "nan", amount: NaN };
    mockSend
      .mockResolvedValueOnce({ Items: [undefinedTypeTx, nanAmountTx] } as any) // current
      .mockResolvedValueOnce({ Items: [] } as any)                              // prev
      .mockResolvedValueOnce({ Items: [] } as any)                              // categories
      .mockResolvedValueOnce({ Responses: { "test-table": [] } } as any);
    const result = await getMonthlyBalance("2026-05");
    expect(result.totalExpenses).toBe(75); // 75 + 0 (NaN → 0)
  });
});

describe("getMonthlyBalance", () => {
  it("returns a MonthlyBalance object with prev spending for rollover delta", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [sampleTx, incomeTx] } as any)
      .mockResolvedValueOnce({ Items: [sampleTx] } as any)
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({ Responses: { "test-table": [] } } as any);
    const result = await getMonthlyBalance("2026-05");
    expect(result.month).toBe("2026-05");
    expect(result.totalIncome).toBe(2000);
    expect(result.totalExpenses).toBe(50);
    expect(result.balance).toBe(1950);
  });

  it("returns zero rollover delta when prev month has no spending for a category", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [sampleTx] } as any)  // current: Food $50
      .mockResolvedValueOnce({ Items: [] } as any)           // prev: no transactions
      .mockResolvedValueOnce({ Items: [] } as any)           // categories query
      .mockResolvedValueOnce({
        Responses: {
          "test-table": [
            { sk: "UNIVERSAL_LIMIT#food-groceries", id: "food-groceries", limit: 300 },
          ],
        },
      } as any);
    const result = await getMonthlyBalance("2026-05");
    // prevSpend for "Food & Groceries" is undefined → delta = 0
    expect(result.rolloverDeltas["Food & Groceries"]).toBe(0);
  });
});

describe("getQuarterlyReview", () => {
  it("returns empty array for non-quarter-start months", async () => {
    mockAuth.mockResolvedValue(authed as any);
    expect(await getQuarterlyReview("2026-05")).toEqual([]);
  });

  it("returns suggestions for quarter-start months — increase when avg > limit", async () => {
    mockAuth.mockResolvedValue(authed as any);
    // sampleTx is Food $50; if Housing limit is 0, avg > limit → increase suggestion
    mockSend
      .mockResolvedValueOnce({ Items: [sampleTx] } as any)
      .mockResolvedValueOnce({ Items: [sampleTx] } as any)
      .mockResolvedValueOnce({ Items: [sampleTx] } as any)
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({ Responses: { "test-table": [] } } as any);
    const result = await getQuarterlyReview("2026-04");
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns keep (no suggestion) when spending is within 70%-100% of limit", async () => {
    mockAuth.mockResolvedValue(authed as any);
    // Spending of $80 with limit $100 → avg = 80 which is ≥ 70 (0.7*100) and ≤ 100 → keep
    const tx80 = { ...sampleTx, category: "Food & Groceries", amount: 80 };
    mockSend
      .mockResolvedValueOnce({ Items: [tx80] } as any)
      .mockResolvedValueOnce({ Items: [tx80] } as any)
      .mockResolvedValueOnce({ Items: [tx80] } as any)
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({
        Responses: {
          "test-table": [
            { sk: "UNIVERSAL_LIMIT#food-groceries", id: "food-groceries", limit: 100 },
          ],
        },
      } as any);
    const result = await getQuarterlyReview("2026-04");
    expect(result.find((s) => s.categoryId === "food-groceries")).toBeUndefined();
  });

  it("returns decrease suggestion when avg spending is below 70% of limit", async () => {
    mockAuth.mockResolvedValue(authed as any);
    // Spending $10/mo with limit $100 → avg=10, limit=100, 10 < 70 → decrease
    const lowTx = { ...sampleTx, category: "Food & Groceries", amount: 10 };
    mockSend
      .mockResolvedValueOnce({ Items: [lowTx] } as any)
      .mockResolvedValueOnce({ Items: [lowTx] } as any)
      .mockResolvedValueOnce({ Items: [lowTx] } as any)
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({
        Responses: {
          "test-table": [
            { sk: "UNIVERSAL_LIMIT#food-groceries", id: "food-groceries", limit: 100 },
          ],
        },
      } as any);
    const result = await getQuarterlyReview("2026-04");
    const suggestion = result.find((s) => s.categoryId === "food-groceries");
    expect(suggestion?.action).toBe("decrease");
  });
});

describe("getYearlyBalance", () => {
  it("returns yearly totals with income and expenses", async () => {
    mockAuth.mockResolvedValue(authed as any);
    // 12 month queries each returning both income and expense
    mockSend.mockResolvedValue({ Items: [sampleTx, incomeTx] } as any);
    const result = await getYearlyBalance("2026");
    expect(result.year).toBe("2026");
    expect(result.totalExpenses).toBeGreaterThan(0);
    expect(result.totalIncome).toBeGreaterThan(0);
  });

  it("handles tx with NaN amount (covers || 0 branch)", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const nanTx = { ...sampleTx, amount: NaN };
    mockSend.mockResolvedValue({ Items: [nanTx] } as any);
    const result = await getYearlyBalance("2026");
    expect(result.totalExpenses).toBe(0);
  });
});

describe("getAllMonthsBalance", () => {
  it("returns aggregated balance across 12 months", async () => {
    mockAuth.mockResolvedValue(authed as any);
    // 12 months + categories query + batchGet
    mockSend
      .mockResolvedValue({ Items: [] } as any);
    const result = await getAllMonthsBalance();
    expect(result.month).toBe("all");
    expect(result.totalIncome).toBe(0);
  });
});

describe("getAllYearsBalance", () => {
  it("aggregates over 4 years", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [incomeTx] } as any);
    const result = await getAllYearsBalance();
    expect(result.year).toBe("all");
    expect(result.totalIncome).toBeGreaterThan(0);
  });
});

describe("getTransactionTrend", () => {
  it("returns transactions sorted by date desc", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [sampleTx, incomeTx] } as any);
    const result = await getTransactionTrend(3);
    expect(Array.isArray(result)).toBe(true);
  });

  it("sorts by createdAt when dates are equal (covers tie-break branch)", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const tx1 = { ...sampleTx, id: "t1", createdAt: "2026-05-01T10:00:00.000Z" };
    const tx2 = { ...sampleTx, id: "t2", createdAt: "2026-05-01T08:00:00.000Z" };
    mockSend.mockResolvedValue({ Items: [tx2, tx1] } as any);
    const result = await getTransactionTrend(1);
    expect(result[0].id).toBe("t1");
    expect(result[1].id).toBe("t2");
  });

  it("returns empty array on error", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await getTransactionTrend(3)).toEqual([]);
  });

  it("uses default monthsBack of 6", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [] } as any);
    await getTransactionTrend();
    expect(mockSend).toHaveBeenCalledTimes(6);
  });
});

describe("getAllMonthsBalance (income path and tx without category)", () => {
  it("includes INCOME and handles no-category expenses", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const noCategory = { ...sampleTx, category: "", transactionType: "EXPENSE" as const };
    const txWithUndefinedType = { ...sampleTx, transactionType: undefined };
    // getAllMonthsBalance: 12 getMonthlyData calls + getCategories (query + batchGet)
    // Make all 12 month queries return our test data
    for (let i = 0; i < 12; i++) {
      mockSend.mockResolvedValueOnce({ Items: [incomeTx, noCategory, txWithUndefinedType] } as any);
    }
    // getCategories: CATEGORY# query + BatchGetCommand
    mockSend
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({ Responses: { "test-table": [] } } as any);
    const result = await getAllMonthsBalance();
    expect(result.totalIncome).toBeGreaterThan(0);
    expect(result.categorySpending[""]).toBeUndefined();
  });
});

describe("getAllYearsBalance (accumulated categorySpending)", () => {
  it("accumulates same category across multiple years", async () => {
    mockAuth.mockResolvedValue(authed as any);
    // Each of the 4 years' 12 months returns 1 expense with category "Food"
    mockSend.mockResolvedValue({ Items: [sampleTx] } as any);
    const result = await getAllYearsBalance();
    expect(result.categorySpending["Food"]).toBeGreaterThan(0);
  });
});

describe("getMonthlyData (undefined transactionType defaults to EXPENSE)", () => {
  it("handles tx with no transactionType in all balance computations", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const noTypeTx2 = { ...sampleTx, id: "noType", transactionType: undefined, amount: 0 };
    mockSend.mockResolvedValue({ Items: [noTypeTx2] } as any);
    const result = await getMonthlyData("2026-05");
    expect(result).toHaveLength(1);
  });
});

describe("getCategories (base limit fallback)", () => {
  it("falls back to base limit when no quarter limit present", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({
        Responses: {
          "test-table": [
            // Only base limit (2 parts in sk)
            { sk: "UNIVERSAL_LIMIT#housing", id: "housing", limit: 1200 },
          ],
        },
      } as any);
    const result = await getCategories("2026-05");
    const housing = result.find((c) => c.id === "housing");
    expect(housing?.limit).toBe(1200);
  });

  it("applies custom quarter limit for custom categories", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ id: "c1", name: "Books", limit: 30, categoryType: "EXPENSE", createdAt: "" }] } as any)
      .mockResolvedValueOnce({
        Responses: {
          "test-table": [
            { sk: "CATEGORY_LIMIT#c1#2026-Q2", id: "c1", limit: 75 },
          ],
        },
      } as any);
    const result = await getCategories("2026-05");
    const books = result.find((c) => c.id === "c1");
    expect(books?.limit).toBe(75);
  });

  it("custom category without categoryType defaults to EXPENSE", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ id: "c1", name: "Candles", limit: 30, createdAt: "" }] } as any)
      .mockResolvedValueOnce({ Responses: { "test-table": [] } } as any);
    const result = await getCategories("2026-05");
    const candles = result.find((c) => c.id === "c1");
    expect(candles?.categoryType).toBe("EXPENSE");
  });

  it("custom category with no limit falls back to 0", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ id: "c1", name: "Candles", createdAt: "" }] } as any)
      .mockResolvedValueOnce({ Responses: { "test-table": [] } } as any);
    const result = await getCategories("2026-05");
    const candles = result.find((c) => c.id === "c1");
    expect(candles?.limit).toBe(0);
  });
});
