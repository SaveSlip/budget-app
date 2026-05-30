import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before importing the module under test
vi.mock("@/lib/db", () => ({
  docClient: { send: vi.fn() },
  TABLE_NAME: "test-table",
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createAccount, updateAccount, listAccounts, deleteAccount } from "./accounts";
import { docClient } from "@/lib/db";
import { auth } from "@/auth";

const mockSend = vi.mocked(docClient.send);
const mockAuth = vi.mocked(auth);

const authedSession = { user: { id: "user-1" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAccount", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await createAccount({ name: "Bank", type: "CHECKING", initialBalance: 0 })).toEqual({ error: "Unauthorized" });
  });

  it("returns validation error for invalid data", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    expect(await createAccount({ name: "", type: "CHECKING", initialBalance: 0 })).toEqual({ error: "Invalid account data." });
  });

  it("creates account and returns success", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockResolvedValue({} as any);
    const result = await createAccount({ name: "Savings", type: "SAVINGS", initialBalance: 1000 });
    expect(result).toMatchObject({ success: true });
    expect(typeof (result as any).id).toBe("string");
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("normalizes account number to last 4 digits", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockResolvedValue({} as any);
    await createAccount({ name: "Visa", type: "CREDIT", initialBalance: 0, accountNumber: "4111111111111234" });
    const callArg = mockSend.mock.calls[0][0] as any;
    expect(callArg.input.Item.accountNumber).toBe("1234");
  });

  it("omits accountNumber when it consists only of non-digit whitespace", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockResolvedValue({} as any);
    await createAccount({ name: "Visa", type: "CREDIT", initialBalance: 0, accountNumber: "   " });
    const callArg = mockSend.mock.calls[0][0] as any;
    expect(callArg.input.Item.accountNumber).toBeUndefined();
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockRejectedValue(new Error("DB error"));
    expect(await createAccount({ name: "Test", type: "CASH", initialBalance: 0 })).toEqual({ error: "Failed to create account." });
  });
});

describe("updateAccount", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await updateAccount("acc-1", { name: "New Name" })).toEqual({ error: "Unauthorized" });
  });

  it("returns error when no fields provided", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    expect(await updateAccount("acc-1", {})).toEqual({ error: "No fields to update." });
  });

  it("updates name successfully", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockResolvedValue({} as any);
    expect(await updateAccount("acc-1", { name: "New Name" })).toEqual({ success: true });
  });

  it("updates accountType successfully", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockResolvedValue({} as any);
    expect(await updateAccount("acc-1", { accountType: "SAVINGS" })).toEqual({ success: true });
  });

  it("normalizes accountNumber on update", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockResolvedValue({} as any);
    await updateAccount("acc-1", { accountNumber: "4111111111115678" });
    const callArg = mockSend.mock.calls[0][0] as any;
    expect(callArg.input.ExpressionAttributeValues[":accountNumber"]).toBe("5678");
  });

  it("falls back to trim when accountNumber has no digits on update", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockResolvedValue({} as any);
    await updateAccount("acc-1", { accountNumber: "NO-DIGITS" });
    const callArg = mockSend.mock.calls[0][0] as any;
    expect(callArg.input.ExpressionAttributeValues[":accountNumber"]).toBe("NO-DIGITS");
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await updateAccount("acc-1", { name: "x" })).toEqual({ error: "Failed to update account." });
  });
});

describe("listAccounts", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await listAccounts()).toEqual({ error: "Unauthorized" });
  });

  it("returns accounts list", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    const items = [{ id: "a1", name: "Chequing" }];
    mockSend.mockResolvedValue({ Items: items } as any);
    expect(await listAccounts()).toEqual({ success: true, accounts: items });
  });

  it("returns empty array when no items", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockResolvedValue({ Items: undefined } as any);
    expect(await listAccounts()).toEqual({ success: true, accounts: [] });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await listAccounts()).toEqual({ error: "Failed to retrieve accounts." });
  });
});

describe("deleteAccount", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await deleteAccount("acc-1")).toEqual({ error: "Unauthorized" });
  });

  it("deletes and returns success", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockResolvedValue({} as any);
    expect(await deleteAccount("acc-1")).toEqual({ success: true });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authedSession as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await deleteAccount("acc-1")).toEqual({ error: "Failed to delete account." });
  });
});
