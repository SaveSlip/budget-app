import { describe, it, expect } from "vitest";
import { transactionSchema } from "./transaction";

describe("transactionSchema", () => {
  const valid = {
    description: "Coffee",
    amount: 4.5,
    date: "2026-05-01",
    category: "Food",
    transactionType: "EXPENSE" as const,
  };

  it("accepts a valid expense", () => {
    const result = transactionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts a valid income", () => {
    const result = transactionSchema.safeParse({ ...valid, transactionType: "INCOME" });
    expect(result.success).toBe(true);
  });

  it("defaults transactionType to EXPENSE when omitted", () => {
    const { transactionType: _, ...noType } = valid;
    const result = transactionSchema.safeParse(noType);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.transactionType).toBe("EXPENSE");
  });

  it("accepts amount as a string matching ^d+(.(d{1,2})?$", () => {
    const result = transactionSchema.safeParse({ ...valid, amount: "12.50" });
    expect(result.success).toBe(true);
  });

  it("rejects amount string with more than 2 decimal places", () => {
    const result = transactionSchema.safeParse({ ...valid, amount: "12.505" });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = transactionSchema.safeParse({ ...valid, description: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty category", () => {
    const result = transactionSchema.safeParse({ ...valid, category: "" });
    expect(result.success).toBe(false);
  });

  it("rejects malformed date", () => {
    const result = transactionSchema.safeParse({ ...valid, date: "01-05-2026" });
    expect(result.success).toBe(false);
  });

  it("accepts ISO datetime string and extracts date part", () => {
    const result = transactionSchema.safeParse({ ...valid, date: "2026-05-01T10:30:00.000Z" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.date).toBe("2026-05-01");
  });

  it("accepts optional accountId when provided", () => {
    const result = transactionSchema.safeParse({ ...valid, accountId: "acc-123" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.accountId).toBe("acc-123");
  });

  it("rejects invalid transactionType enum value", () => {
    const result = transactionSchema.safeParse({ ...valid, transactionType: "TRANSFER" });
    expect(result.success).toBe(false);
  });
});
