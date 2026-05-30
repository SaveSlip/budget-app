import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ docClient: { send: vi.fn() }, TABLE_NAME: "test-table" }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createRecurringTransaction,
  listRecurringTransactions,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransaction,
} from "./recurring";
import { docClient } from "@/lib/db";
import { auth } from "@/auth";

const mockSend = vi.mocked(docClient.send);
const mockAuth = vi.mocked(auth);
const authed = { user: { id: "u1" } };

const validData = {
  description: "Rent",
  amount: 1500,
  category: "Housing",
  transactionType: "EXPENSE" as const,
  frequency: "MONTHLY" as const,
  isActive: true,
};

beforeEach(() => vi.clearAllMocks());

describe("createRecurringTransaction", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await createRecurringTransaction(validData)).toEqual({ error: "Unauthorized" });
  });

  it("returns validation error for invalid data", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const result = await createRecurringTransaction({ ...validData, amount: -1 });
    expect(result).toHaveProperty("error");
  });

  it("creates transaction and returns id", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    const result = await createRecurringTransaction(validData);
    expect(result).not.toHaveProperty("error");
    expect(typeof (result as any).id).toBe("string");
  });

  it("creates transaction with WEEKLY frequency and dayOfWeek", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    const result = await createRecurringTransaction({ ...validData, frequency: "WEEKLY", dayOfWeek: 1 });
    expect(result).not.toHaveProperty("error");
  });

  it("creates transaction with YEARLY frequency and monthOfYear", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    const result = await createRecurringTransaction({ ...validData, frequency: "YEARLY", monthOfYear: 12, dayOfYear: 25 });
    expect(result).not.toHaveProperty("error");
  });
});

describe("listRecurringTransactions", () => {
  it("returns empty array when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await listRecurringTransactions()).toEqual([]);
  });

  it("returns items from DB with nextRunDate coerced", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({
      Items: [{ id: "r1", nextRunDate: "2026-06-01" }, { id: "r2" }],
    } as any);
    const result = await listRecurringTransactions();
    expect(result[0].nextRunDate).toBe("2026-06-01");
    expect(result[1].nextRunDate).toBe("—");
  });

  it("returns empty array when Items is undefined", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: undefined } as any);
    expect(await listRecurringTransactions()).toEqual([]);
  });
});

describe("updateRecurringTransaction", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await updateRecurringTransaction("r1", validData)).toEqual({ error: "Unauthorized" });
  });

  it("returns validation error for invalid data", async () => {
    mockAuth.mockResolvedValue(authed as any);
    expect(await updateRecurringTransaction("r1", { ...validData, description: "" })).toHaveProperty("error");
  });

  it("updates and returns empty object", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await updateRecurringTransaction("r1", validData)).toEqual({});
  });
});

describe("deleteRecurringTransaction", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await deleteRecurringTransaction("r1")).toEqual({ error: "Unauthorized" });
  });

  it("deletes and returns empty object", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await deleteRecurringTransaction("r1")).toEqual({});
  });
});

describe("toggleRecurringTransaction", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await toggleRecurringTransaction("r1", false)).toEqual({ error: "Unauthorized" });
  });

  it("updates isActive and returns empty object", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await toggleRecurringTransaction("r1", false)).toEqual({});
    const callArg = mockSend.mock.calls[0][0] as any;
    expect(callArg.input.ExpressionAttributeValues[":isActive"]).toBe(false);
  });
});
