import { describe, it, expect } from "vitest";
import { recurringTransactionSchema } from "./recurring";

describe("recurringTransactionSchema", () => {
  const valid = {
    description: "Rent",
    amount: 1500,
    category: "Housing",
    transactionType: "EXPENSE" as const,
    frequency: "MONTHLY" as const,
    isActive: true,
  };

  it("accepts a valid recurring expense", () => {
    expect(recurringTransactionSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults transactionType to EXPENSE", () => {
    const { transactionType: _, ...noType } = valid;
    const result = recurringTransactionSchema.safeParse(noType);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.transactionType).toBe("EXPENSE");
  });

  it("defaults frequency to MONTHLY", () => {
    const { frequency: _, ...noFreq } = valid;
    const result = recurringTransactionSchema.safeParse(noFreq);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.frequency).toBe("MONTHLY");
  });

  it("defaults isActive to true", () => {
    const { isActive: _, ...noActive } = valid;
    const result = recurringTransactionSchema.safeParse(noActive);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isActive).toBe(true);
  });

  it("rejects non-positive amount", () => {
    expect(recurringTransactionSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(recurringTransactionSchema.safeParse({ ...valid, amount: -10 }).success).toBe(false);
  });

  it("rejects empty description", () => {
    expect(recurringTransactionSchema.safeParse({ ...valid, description: "" }).success).toBe(false);
  });

  it("rejects empty category", () => {
    expect(recurringTransactionSchema.safeParse({ ...valid, category: "" }).success).toBe(false);
  });

  it.each(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const)("accepts frequency %s", (frequency) => {
    expect(recurringTransactionSchema.safeParse({ ...valid, frequency }).success).toBe(true);
  });

  it("rejects invalid frequency", () => {
    expect(recurringTransactionSchema.safeParse({ ...valid, frequency: "HOURLY" }).success).toBe(false);
  });

  it("accepts dayOfMonth 1–31", () => {
    expect(recurringTransactionSchema.safeParse({ ...valid, dayOfMonth: 1 }).success).toBe(true);
    expect(recurringTransactionSchema.safeParse({ ...valid, dayOfMonth: 31 }).success).toBe(true);
  });

  it("rejects dayOfMonth outside 1–31", () => {
    expect(recurringTransactionSchema.safeParse({ ...valid, dayOfMonth: 0 }).success).toBe(false);
    expect(recurringTransactionSchema.safeParse({ ...valid, dayOfMonth: 32 }).success).toBe(false);
  });

  it("accepts dayOfWeek 0–6", () => {
    expect(recurringTransactionSchema.safeParse({ ...valid, dayOfWeek: 0 }).success).toBe(true);
    expect(recurringTransactionSchema.safeParse({ ...valid, dayOfWeek: 6 }).success).toBe(true);
  });

  it("rejects dayOfWeek outside 0–6", () => {
    expect(recurringTransactionSchema.safeParse({ ...valid, dayOfWeek: -1 }).success).toBe(false);
    expect(recurringTransactionSchema.safeParse({ ...valid, dayOfWeek: 7 }).success).toBe(false);
  });

  it("accepts monthOfYear 1–12 and dayOfYear 1–31", () => {
    expect(recurringTransactionSchema.safeParse({ ...valid, monthOfYear: 6, dayOfYear: 15 }).success).toBe(true);
  });

  it("rejects monthOfYear outside 1–12", () => {
    expect(recurringTransactionSchema.safeParse({ ...valid, monthOfYear: 0 }).success).toBe(false);
    expect(recurringTransactionSchema.safeParse({ ...valid, monthOfYear: 13 }).success).toBe(false);
  });

  it("accepts optional accountId", () => {
    const result = recurringTransactionSchema.safeParse({ ...valid, accountId: "acc-1" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.accountId).toBe("acc-1");
  });
});
