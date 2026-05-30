import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/app/actions/transactions", () => ({ getAllTransactions: vi.fn() }));
vi.mock("papaparse", () => ({ default: { unparse: vi.fn().mockReturnValue("Date,Description,Category,Amount\n") } }));

import { GET } from "./route";
import { auth } from "@/auth";
import { getAllTransactions } from "@/app/actions/transactions";

const mockAuth = vi.mocked(auth);
const mockGetAll = vi.mocked(getAllTransactions);

beforeEach(() => vi.clearAllMocks());

describe("GET /api/export/transactions", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 500 when getAllTransactions returns an error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as any);
    mockGetAll.mockResolvedValue({ error: "DB error" } as any);
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("returns CSV with correct headers on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as any);
    mockGetAll.mockResolvedValue({
      transactions: [{ date: "2026-05-01", description: "Coffee", category: "Food", amount: 4.5 }],
    } as any);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toMatch(/attachment; filename="transactions-/);
  });

  it("handles empty transactions list gracefully", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as any);
    mockGetAll.mockResolvedValue({ transactions: [] } as any);
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("handles undefined transactions (covers ?? [] branch)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as any);
    mockGetAll.mockResolvedValue({ transactions: undefined } as any);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
