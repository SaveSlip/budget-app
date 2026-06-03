import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ docClient: { send: vi.fn() }, TABLE_NAME: "test-table" }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/budget", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/budget")>();
  return { ...actual, currentQuarter: () => "2026-Q2" };
});

import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategoryLimit,
  updateUniversalCategoryLimit,
  updateCategory,
  saveOnboardingLimits,
} from "./categories";
import { docClient } from "@/lib/db";
import { auth } from "@/auth";

const mockSend = vi.mocked(docClient.send);
const mockAuth = vi.mocked(auth);
const authed = { user: { id: "u1" } };

beforeEach(() => vi.clearAllMocks());

describe("createCategory", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await createCategory({ name: "Gaming", limit: 50 })).toEqual({ error: "Unauthorized" });
  });

  it("rejects a name that matches a universal category", async () => {
    mockAuth.mockResolvedValue(authed as any);
    // "Netflix" matches the subscriptions universal category
    mockSend.mockResolvedValue({ Items: [] } as any);
    const result = await createCategory({ name: "Netflix", limit: 20 });
    expect(result).toHaveProperty("error", "universal");
  });

  it("rejects a universal income category name", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({ Items: [] } as any);
    const result = await createCategory({ name: "Salary", limit: 0, categoryType: "INCOME" });
    expect(result).toHaveProperty("error", "universal");
  });

  it("rejects a duplicate custom category name", async () => {
    mockAuth.mockResolvedValue(authed as any);
    // First two sends are for listCategories (CATEGORY# query + UNIVERSAL_LIMIT# query), returning an existing "Gaming" custom cat
    mockSend
      .mockResolvedValueOnce({ Items: [{ id: "c1", name: "Gaming" }] } as any)
      .mockResolvedValueOnce({ Items: [] } as any);
    const result = await createCategory({ name: "Gaming", limit: 50 });
    expect(result).toHaveProperty("error", "duplicate");
  });

  it("creates category on success", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({} as any);
    const result = await createCategory({ name: "Candles", limit: 30 });
    expect(result).toMatchObject({ success: true });
  });

  it("defaults categoryType to EXPENSE when omitted (covers ?? 'EXPENSE' branch)", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({} as any);
    const result = await createCategory({ name: "Candles", limit: 10 });
    expect(result).toMatchObject({ success: true });
    const putItem = (mockSend.mock.calls[2][0] as any).input.Item;
    expect(putItem.categoryType).toBe("EXPENSE");
  });

  it("defaults limit to 0 when undefined (covers limit ?? 0 branch)", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({} as any);
    const result = await createCategory({ name: "Candles", limit: undefined as any });
    expect(result).toMatchObject({ success: true });
    const putItem = (mockSend.mock.calls[2][0] as any).input.Item;
    expect(putItem.limit).toBe(0);
  });

  it("returns error when DB throws on create", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockRejectedValueOnce(new Error("DB error"));
    expect(await createCategory({ name: "Candles", limit: 30 })).toHaveProperty("error");
  });
});

describe("deleteCategory", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await deleteCategory("c1")).toEqual({ error: "Unauthorized" });
  });

  it("rejects deletion of a universal category", async () => {
    mockAuth.mockResolvedValue(authed as any);
    expect(await deleteCategory("housing")).toEqual({ error: "Cannot delete a universal category" });
  });

  it("deletes custom category successfully", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await deleteCategory("custom-123")).toEqual({ success: true });
  });

  it("returns error when DB throws on delete", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await deleteCategory("custom-123")).toHaveProperty("error");
  });
});

describe("listCategories", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await listCategories()).toEqual({ error: "Unauthorized" });
  });

  it("returns merged category list", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ id: "c1", name: "Books", limit: 30, categoryType: "EXPENSE" }] } as any)
      .mockResolvedValueOnce({ Items: [] } as any);
    const result = await listCategories();
    expect(result).toHaveProperty("success", true);
    expect(Array.isArray((result as any).categories)).toBe(true);
  });

  it("filters out custom categories whose name matches a universal category", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [{ id: "c99", name: "Housing", limit: 1500, categoryType: "EXPENSE" }] } as any)
      .mockResolvedValueOnce({ Items: [] } as any);
    const result = await listCategories();
    if ("success" in result && result.success) {
      const custom = result.categories.filter((c: any) => c.id === "c99");
      expect(custom.length).toBe(0);
    }
  });

  it("handles undefined limitItems (covers ?? [] branch for limitItems)", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({ Items: [] } as any)
      .mockResolvedValueOnce({} as any);
    const result = await listCategories();
    expect(result).toHaveProperty("success", true);
  });

  it("handles undefined Items for main categories query (covers ?? [] branch for Items)", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend
      .mockResolvedValueOnce({} as any)      // no Items key
      .mockResolvedValueOnce({ Items: [] } as any);
    const result = await listCategories();
    expect(result).toHaveProperty("success", true);
  });

  it("returns error with empty categories array when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    const result = await listCategories();
    expect(result).toHaveProperty("error");
    expect((result as any).categories).toEqual([]);
  });
});

describe("updateCategoryLimit", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await updateCategoryLimit("c1", 100)).toEqual({ error: "Unauthorized" });
  });

  it("returns error for negative limit", async () => {
    mockAuth.mockResolvedValue(authed as any);
    expect(await updateCategoryLimit("c1", -5)).toEqual({ error: "Invalid limit value" });
  });

  it("updates limit successfully", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await updateCategoryLimit("c1", 200)).toEqual({ success: true });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await updateCategoryLimit("c1", 200)).toHaveProperty("error");
  });
});

describe("updateUniversalCategoryLimit", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await updateUniversalCategoryLimit("housing", 1500)).toEqual({ error: "Unauthorized" });
  });

  it("rejects non-universal category id", async () => {
    mockAuth.mockResolvedValue(authed as any);
    expect(await updateUniversalCategoryLimit("custom-id", 100)).toEqual({ error: "Not a universal category" });
  });

  it("returns error for negative limit", async () => {
    mockAuth.mockResolvedValue(authed as any);
    expect(await updateUniversalCategoryLimit("housing", -1)).toEqual({ error: "Invalid limit value" });
  });

  it("updates universal limit successfully", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await updateUniversalCategoryLimit("housing", 2000)).toEqual({ success: true });
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await updateUniversalCategoryLimit("housing", 2000)).toHaveProperty("error");
  });
});

describe("updateCategory", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await updateCategory("c1", { name: "Books", limit: 50 })).toEqual({ error: "Unauthorized" });
  });

  it("updates category successfully", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await updateCategory("c1", { name: "Books", limit: 50 })).toEqual({ success: true });
  });

  it("handles limit of 0 successfully", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await updateCategory("c1", { name: "Candles", limit: 0 })).toEqual({ success: true });
  });

  it("handles undefined limit via nullish coalescing (covers ?? 0 branch)", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    // Pass undefined limit via cast to cover the ?? 0 defensive branch
    expect(await updateCategory("c1", { name: "Candles", limit: undefined as any })).toEqual({ success: true });
    const firstCall = mockSend.mock.calls[0][0] as any;
    expect(firstCall.input.ExpressionAttributeValues[":limit"]).toBe(0);
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await updateCategory("c1", { name: "Books", limit: 50 })).toHaveProperty("error");
  });
});

describe("saveOnboardingLimits", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await saveOnboardingLimits({ housing: 1500 })).toEqual({ error: "Unauthorized" });
  });

  it("skips invalid category ids and zero values", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    // "unknown-id" is not a valid universal category; limit 0 is also skipped
    expect(await saveOnboardingLimits({ "unknown-id": 500, housing: 0 })).toEqual({ success: true });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("saves valid limits", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await saveOnboardingLimits({ housing: 1500, transportation: 300 })).toEqual({ success: true });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await saveOnboardingLimits({ housing: 1500 })).toHaveProperty("error");
  });
});
