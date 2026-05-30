import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ docClient: { send: vi.fn() }, TABLE_NAME: "test-table" }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { getCategoryRules, saveCategoryRule } from "./categoryRules";
import { docClient } from "@/lib/db";
import { auth } from "@/auth";

const mockSend = vi.mocked(docClient.send);
const mockAuth = vi.mocked(auth);
const authed = { user: { id: "u1" } };

beforeEach(() => vi.clearAllMocks());

describe("getCategoryRules", () => {
  it("returns empty array when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await getCategoryRules()).toEqual([]);
  });

  it("returns items from DB", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const rules = [{ id: "r1", merchantKeyword: "starbucks" }];
    mockSend.mockResolvedValue({ Items: rules } as any);
    expect(await getCategoryRules()).toEqual(rules);
  });

  it("returns empty array when Items is undefined", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: undefined } as any);
    expect(await getCategoryRules()).toEqual([]);
  });

  it("returns empty array when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await getCategoryRules()).toEqual([]);
  });
});

describe("saveCategoryRule", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await saveCategoryRule("starbucks", "Coffee", "EXPENSE")).toEqual({ error: "Unauthorized" });
  });

  it("returns error for empty keyword", async () => {
    mockAuth.mockResolvedValue(authed as any);
    expect(await saveCategoryRule("   ", "Coffee", "EXPENSE")).toEqual({ error: "Merchant keyword cannot be empty." });
  });

  it("saves new rule when no existing rule found", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [] } as any)  // duplicate check query
      .mockResolvedValueOnce({} as any);             // put command
    expect(await saveCategoryRule("starbucks", "Coffee", "EXPENSE")).toEqual({ success: true });
  });

  it("reuses existing rule ID when duplicate keyword found", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ id: "existing-rule-id" }] } as any)
      .mockResolvedValueOnce({} as any);
    await saveCategoryRule("starbucks", "Coffee", "EXPENSE");
    const putCallArg = mockSend.mock.calls[1][0] as any;
    expect(putCallArg.input.Item.id).toBe("existing-rule-id");
  });

  it("generates new id when existing item has no id field", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ merchantKeyword: "starbucks" }] } as any) // item exists but no id
      .mockResolvedValueOnce({} as any);
    const result = await saveCategoryRule("starbucks", "Coffee", "EXPENSE");
    expect(result).toEqual({ success: true });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await saveCategoryRule("amazon", "Shopping", "EXPENSE")).toEqual({ error: "Failed to save rule." });
  });
});
