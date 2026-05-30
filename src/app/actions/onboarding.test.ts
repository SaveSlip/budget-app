import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ docClient: { send: vi.fn() }, TABLE_NAME: "test-table" }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { updateUserName, completeOnboarding } from "./onboarding";
import { docClient } from "@/lib/db";
import { auth } from "@/auth";

const mockSend = vi.mocked(docClient.send);
const mockAuth = vi.mocked(auth);
const authed = { user: { id: "u1", email: "test@example.com" } };

beforeEach(() => vi.clearAllMocks());

describe("updateUserName", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await updateUserName("Aman")).toEqual({ error: "Unauthorized" });
  });

  it("returns validation error for empty name", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const result = await updateUserName("");
    expect(result).toHaveProperty("error");
  });

  it("returns validation error for name over 80 chars", async () => {
    mockAuth.mockResolvedValue(authed as any);
    const result = await updateUserName("a".repeat(81));
    expect(result).toHaveProperty("error");
  });

  it("updates name and returns empty object on success", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await updateUserName("Aman")).toEqual({});
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

describe("completeOnboarding", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await completeOnboarding()).toEqual({ error: "Unauthorized" });
  });

  it("completes onboarding and returns empty object", async () => {
    mockAuth.mockResolvedValue(authed as any);
    mockSend.mockResolvedValue({} as any);
    expect(await completeOnboarding()).toEqual({});
    expect(mockSend).toHaveBeenCalledOnce();
  });
});
