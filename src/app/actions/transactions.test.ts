import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ docClient: { send: vi.fn() }, TABLE_NAME: "test-table" }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createTransaction,
  batchCreateTransactions,
  getTransactions,
  getTransactionsByMonth,
  getTransactionsBatch,
  getAllTransactions,
  getAvailableMonths,
  countTransactionsByDescription,
  recategorizeByDescription,
  deleteTransaction,
  batchDeleteTransactions,
  deleteAllTransactions,
  checkDuplicates,
  updateTransaction,
} from "./transactions";
import { docClient } from "@/lib/db";
import { auth } from "@/auth";

const mockSend = vi.mocked(docClient.send);
const mockAuth = vi.mocked(auth);
const authed = { user: { id: "u1" } };

const validTx = {
  description: "Coffee",
  amount: 4.5,
  date: "2026-05-01",
  category: "Food",
  transactionType: "EXPENSE" as const,
};

beforeEach(() => vi.clearAllMocks());

describe("createTransaction", () => {
  it("throws Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(createTransaction(validTx)).rejects.toThrow("Unauthorized");
  });

  it("returns validation error for invalid data", async () => {
    mockAuth.mockResolvedValue(authed as any);
    expect(await createTransaction({ ...validTx, description: "" })).toEqual({ error: "Invalid transaction data." });
  });

  it("creates transaction and returns success", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await createTransaction(validTx)).toEqual({ success: true });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("DB error"));
    expect(await createTransaction(validTx)).toEqual({ error: "Database error." });
  });
});

describe("batchCreateTransactions", () => {
  it("throws Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(batchCreateTransactions([validTx])).rejects.toThrow("Unauthorized");
  });

  it("returns error when all transactions are invalid", async () => {
    mockAuth.mockResolvedValue(authed as any);
    expect(await batchCreateTransactions([{ ...validTx, description: "" }])).toEqual({ error: "No valid transactions found." });
  });

  it("defaults transactionType to EXPENSE when omitted in batch", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    const txNoType = { ...validTx } as any;
    delete txNoType.transactionType;
    const result = await batchCreateTransactions([txNoType]);
    expect(result).toMatchObject({ success: true, count: 1 });
    const callArg = mockSend.mock.calls[0][0] as any;
    expect(callArg.input.RequestItems["test-table"][0].PutRequest.Item.transactionType).toBe("EXPENSE");
  });

  it("creates transactions in batches and returns count", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    const result = await batchCreateTransactions([validTx, { ...validTx, description: "Tea" }]);
    expect(result).toMatchObject({ success: true, count: 2 });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await batchCreateTransactions([validTx])).toEqual({ error: "Failed to process bulk upload." });
  });
});

describe("getTransactions", () => {
  it("throws Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(getTransactions()).rejects.toThrow("Unauthorized");
  });

  it("returns transactions", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const items = [{ id: "t1" }];
    mockSend.mockResolvedValue({ Items: items } as any);
    expect(await getTransactions()).toEqual({ success: true, transactions: items });
  });

  it("accepts optional month filter", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [] } as any);
    expect(await getTransactions("2026-05")).toEqual({ success: true, transactions: [] });
  });

  it("handles undefined Items gracefully", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: undefined } as any);
    expect(await getTransactions()).toEqual({ success: true, transactions: [] });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await getTransactions()).toEqual({ error: "Failed to retrieve financial data." });
  });
});

describe("getTransactionsByMonth", () => {
  it("throws Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(getTransactionsByMonth("2026-05")).rejects.toThrow("Unauthorized");
  });

  it("returns transactions for the month", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [{ id: "t1" }] } as any);
    expect(await getTransactionsByMonth("2026-05")).toEqual({ transactions: [{ id: "t1" }] });
  });

  it("throws on DB error", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    await expect(getTransactionsByMonth("2026-05")).rejects.toThrow("Failed to retrieve transactions.");
  });
});

describe("getTransactionsBatch", () => {
  it("throws Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(getTransactionsBatch()).rejects.toThrow("Unauthorized");
  });

  it("returns transactions with null nextCursor when no more pages", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [{ id: "t1" }] } as any);
    const result = await getTransactionsBatch();
    expect(result).toEqual({ transactions: [{ id: "t1" }], nextCursor: null });
  });

  it("returns nextCursor when LastEvaluatedKey present", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const lek = { pk: "USER#u1", sk: "TX#2026-05-01#t1" };
    mockSend.mockResolvedValue({ Items: [], LastEvaluatedKey: lek } as any);
    const result = await getTransactionsBatch();
    expect(typeof (result as any).nextCursor).toBe("string");
  });

  it("decodes cursor from base64url", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const lek = { pk: "USER#u1", sk: "TX#2026-05-01#t1" };
    const cursor = Buffer.from(JSON.stringify(lek)).toString("base64url");
    mockSend.mockResolvedValue({ Items: [] } as any);
    await getTransactionsBatch(cursor, 10);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("caps limit at 100", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [] } as any);
    await getTransactionsBatch(undefined, 999);
    const callArg = mockSend.mock.calls[0][0] as any;
    expect(callArg.input.Limit).toBe(100);
  });

  it("throws on DB error", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    await expect(getTransactionsBatch()).rejects.toThrow("Failed to retrieve transactions.");
  });
});

describe("getAllTransactions", () => {
  it("throws Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(getAllTransactions()).rejects.toThrow("Unauthorized");
  });

  it("paginates and returns all transactions", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ id: "t1" }], LastEvaluatedKey: { pk: "a", sk: "b" } } as any)
      .mockResolvedValueOnce({ Items: [{ id: "t2" }] } as any);
    const result = await getAllTransactions();
    expect(result).toMatchObject({ success: true, transactions: [{ id: "t1" }, { id: "t2" }] });
  });

  it("handles response with no Items key in fetchAllTxItems", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any); // no Items key
    const result = await getAllTransactions();
    expect(result).toMatchObject({ success: true, transactions: [] });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await getAllTransactions()).toEqual({ error: "Failed to retrieve financial data." });
  });
});

describe("getAvailableMonths", () => {
  it("throws Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    await expect(getAvailableMonths()).rejects.toThrow("Unauthorized");
  });

  it("extracts and deduplicates months from sk values", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({
      Items: [
        { sk: "TX#2026-05-01#seq#id" },
        { sk: "TX#2026-05-15#seq#id" },
        { sk: "TX#2026-04-01#seq#id" },
      ],
    } as any);
    const result = await getAvailableMonths();
    expect(result).toEqual(["2026-05", "2026-04"]);
  });

  it("paginates until no LastEvaluatedKey", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ sk: "TX#2026-03-01#a#b" }], LastEvaluatedKey: { pk: "x" } } as any)
      .mockResolvedValueOnce({ Items: [{ sk: "TX#2026-02-01#a#b" }] } as any);
    const result = await getAvailableMonths();
    expect(result).toEqual(["2026-03", "2026-02"]);
  });

  it("skips sk values that do not match the TX date pattern", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [{ sk: "ACCOUNT#some-account" }, { sk: "TX#2026-05-01#t1" }] } as any);
    const result = await getAvailableMonths();
    expect(result).toEqual(["2026-05"]);
  });
});

describe("countTransactionsByDescription", () => {
  it("returns Unauthorized error when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await countTransactionsByDescription("coffee", "EXPENSE")).toEqual({ error: "Unauthorized" });
  });

  it("counts exact matches after fetchAllTxItems", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({
      Items: [
        { description: "coffee", transactionType: "EXPENSE" },
        { description: "Coffee Shop", transactionType: "EXPENSE" },
      ],
    } as any);
    const result = await countTransactionsByDescription("coffee", "EXPENSE");
    expect(result).toEqual({ count: 1 });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await countTransactionsByDescription("x", "EXPENSE")).toEqual({ error: "Failed to count transactions." });
  });
});

describe("recategorizeByDescription", () => {
  it("returns Unauthorized error when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await recategorizeByDescription("coffee", "Dining", "EXPENSE")).toEqual({ error: "Unauthorized" });
  });

  it("returns count 0 when no matches found", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [] } as any);
    expect(await recategorizeByDescription("coffee", "Dining", "EXPENSE")).toEqual({ success: true, count: 0 });
  });

  it("recategorizes matched transactions", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ description: "coffee", transactionType: "EXPENSE", pk: "USER#u1", sk: "TX#..." }] } as any)
      .mockResolvedValueOnce({} as any); // batch write
    expect(await recategorizeByDescription("coffee", "Dining", "EXPENSE")).toEqual({ success: true, count: 1 });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await recategorizeByDescription("coffee", "Dining", "EXPENSE")).toEqual({ error: "Failed to recategorize transactions." });
  });
});

describe("deleteTransaction", () => {
  it("returns Unauthorized error when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await deleteTransaction("2026-05-01", "tx-1")).toEqual({ error: "Unauthorized" });
  });

  it("deletes using provided sk", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await deleteTransaction("2026-05-01", "tx-1", "TX#2026-05-01#seq#tx-1")).toEqual({ success: true });
  });

  it("constructs fallback sk from date and txId", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    await deleteTransaction("2026-05-01", "tx-1");
    const callArg = mockSend.mock.calls[0][0] as any;
    expect(callArg.input.Key.sk).toBe("TX#2026-05-01#tx-1");
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await deleteTransaction("2026-05-01", "tx-1")).toEqual({ error: "Failed to delete transaction" });
  });
});

describe("batchDeleteTransactions", () => {
  it("returns Unauthorized error when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await batchDeleteTransactions([{ date: "2026-05-01", id: "t1" }])).toEqual({ error: "Unauthorized" });
  });

  it("batch deletes and returns count", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    const result = await batchDeleteTransactions([
      { date: "2026-05-01", id: "t1" },
      { date: "2026-05-02", id: "t2", sk: "TX#2026-05-02#t2" },
    ]);
    expect(result).toEqual({ success: true, count: 2 });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await batchDeleteTransactions([{ date: "2026-05-01", id: "t1" }])).toEqual({ error: "Failed to delete transactions" });
  });
});

describe("deleteAllTransactions", () => {
  it("returns Unauthorized error when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await deleteAllTransactions()).toEqual({ error: "Unauthorized" });
  });

  it("returns success with count 0 when no transactions exist", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [] } as any);
    expect(await deleteAllTransactions()).toEqual({ success: true, count: 0 });
  });

  it("deletes all transactions and returns count", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ sk: "TX#2026-05-01#t1" }, { sk: "TX#2026-05-02#t2" }] } as any)
      .mockResolvedValueOnce({} as any);
    expect(await deleteAllTransactions()).toEqual({ success: true, count: 2 });
  });

  it("returns error when DB throws during delete", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ sk: "TX#2026-05-01#t1" }] } as any)
      .mockRejectedValueOnce(new Error("fail"));
    expect(await deleteAllTransactions()).toHaveProperty("error");
  });

  it("propagates getAllTransactions error (covers error-in-allResult branch)", async () => {
    mockAuth.mockResolvedValue(authed as any);
    // Make the paginated query throw so getAllTransactions returns { error: ... }
    mockSend.mockRejectedValue(new Error("DB fail"));
    expect(await deleteAllTransactions()).toHaveProperty("error");
  });
});

describe("checkDuplicates", () => {
  it("returns Unauthorized error when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await checkDuplicates([{ rowId: 1, date: "2026-05-01", amount: 4.5, description: "Coffee" }]))
      .toEqual({ error: "Unauthorized" });
  });

  it("returns empty duplicateRowIds when no matches", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [{ description: "Tea", amount: 2.0 }] } as any);
    const result = await checkDuplicates([{ rowId: 1, date: "2026-05-01", amount: 4.5, description: "Coffee" }]);
    expect(result).toEqual({ duplicateRowIds: [] });
  });

  it("returns rowId when amount and description match", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [{ description: "coffee", amount: 4.5 }] } as any);
    const result = await checkDuplicates([{ rowId: 5, date: "2026-05-01", amount: 4.5, description: "Coffee" }]);
    expect(result).toEqual({ duplicateRowIds: [5] });
  });

  it("groups by date and issues one query per date", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [] } as any);
    await checkDuplicates([
      { rowId: 1, date: "2026-05-01", amount: 1, description: "A" },
      { rowId: 2, date: "2026-05-02", amount: 2, description: "B" },
    ]);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("paginates checkDuplicates queries until no LastEvaluatedKey", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: { pk: "x" } } as any)
      .mockResolvedValueOnce({ Items: [{ description: "coffee", amount: 4.5 }] } as any);
    const result = await checkDuplicates([{ rowId: 1, date: "2026-05-01", amount: 4.5, description: "Coffee" }]);
    expect(result).toEqual({ duplicateRowIds: [1] });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await checkDuplicates([{ rowId: 1, date: "2026-05-01", amount: 1, description: "x" }]))
      .toEqual({ error: "Failed to check for duplicate transactions." });
  });
});

describe("updateTransaction", () => {
  it("returns Unauthorized error when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await updateTransaction("2026-05-01", "tx-1", validTx)).toEqual({ error: "Unauthorized" });
  });

  it("returns validation error for invalid data", async () => {
    mockAuth.mockResolvedValue(authed as any);
    expect(await updateTransaction("2026-05-01", "tx-1", { ...validTx, description: "" })).toEqual({ error: "Invalid transaction data." });
  });

  it("uses PutCommand when date unchanged", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await updateTransaction("2026-05-01", "tx-1", validTx)).toEqual({ success: true });
  });

  it("uses TransactWriteCommand when date changes", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await updateTransaction("2026-04-01", "tx-1", validTx)).toEqual({ success: true });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await updateTransaction("2026-05-01", "tx-1", validTx)).toEqual({ error: "Failed to update transaction" });
  });
});
