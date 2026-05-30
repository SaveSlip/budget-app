import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs before the vi.mock hoisting, so this value is available in factory closures
const sesStub = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@/lib/db", () => ({
  docClient: { send: vi.fn() },
  TABLE_NAME: "test-table",
  createUserRecord: vi.fn(),
  deletePartition: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() },
}));
vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: function SESClient() { return sesStub; },
  SendEmailCommand: function SendEmailCommand(input: unknown) { return input; },
}));
vi.mock("sst", () => ({
  Resource: { EmailIdentity: { sender: "noreply@budgify.app" } },
}));
vi.mock("date-fns", async (importOriginal) => {
  const actual = await importOriginal<typeof import("date-fns")>();
  return { ...actual, formatDuration: () => "1 hour", intervalToDuration: () => ({}) };
});

import {
  registerUser,
  logout,
  changePasswordAction,
  forgotPasswordAction,
  validateResetTokenAction,
  resetPasswordAction,
  verifyEmailToken,
  resendVerificationEmail,
  deleteAccount,
  sendVerificationEmail,
} from "./auth";
import { docClient, createUserRecord, deletePartition } from "@/lib/db";
import { auth, signOut } from "@/auth";
import bcrypt from "bcryptjs";

const mockSend = vi.mocked(docClient.send);
const mockAuth = vi.mocked(auth);
const mockCreateUserRecord = vi.mocked(createUserRecord);
const mockDeletePartition = vi.mocked(deletePartition);
const mockSignOut = vi.mocked(signOut);
const mockBcrypt = vi.mocked(bcrypt);

beforeEach(() => {
  vi.clearAllMocks();
  sesStub.send = vi.fn();
});

describe("logout", () => {
  it("calls signOut and redirect", async () => {
    const mockRedirect = vi.mocked(await import("next/navigation").then((m) => m.redirect));
    mockSignOut.mockResolvedValue(undefined as any);
    await logout();
    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith("/signin");
  });
});

describe("registerUser", () => {
  it("returns error for invalid input", async () => {
    const result = await registerUser({ email: "bad", password: "short", confirmPassword: "short" });
    expect(result).toHaveProperty("error");
  });

  it("creates user and returns success", async () => {
    mockCreateUserRecord.mockResolvedValue({} as any);
    const result = await registerUser({ email: "a@b.com", password: "Password1!", confirmPassword: "Password1!" });
    expect(result).toEqual({ success: true });
  });

  it("handles unverified existing account", async () => {
    mockCreateUserRecord.mockResolvedValue({ error: "email exists" } as any);
    mockSend.mockResolvedValue({ Item: { emailVerified: false } } as any);
    const result = await registerUser({ email: "a@b.com", password: "Password1!", confirmPassword: "Password1!" });
    expect(result).toMatchObject({ error: expect.any(String), needsVerification: true });
  });

  it("returns error when user already exists and is verified", async () => {
    mockCreateUserRecord.mockResolvedValue({ error: "email exists" } as any);
    mockSend.mockResolvedValue({ Item: { emailVerified: true } } as any);
    const result = await registerUser({ email: "a@b.com", password: "Password1!", confirmPassword: "Password1!" });
    expect(result).toHaveProperty("error");
    expect(result).not.toHaveProperty("needsVerification");
  });

  it("returns internal error when createUserRecord throws", async () => {
    mockCreateUserRecord.mockRejectedValue(new Error("unexpected"));
    const result = await registerUser({ email: "a@b.com", password: "Password1!", confirmPassword: "Password1!" });
    expect(result).toHaveProperty("error", "Internal Server Error");
  });
});

describe("changePasswordAction", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    const result = await changePasswordAction({ currentPassword: "old", newPassword: "newPass1!", confirmPassword: "newPass1!" });
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns validation error for invalid input", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@b.com" } } as any);
    const result = await changePasswordAction({ currentPassword: "", newPassword: "short", confirmPassword: "short" });
    expect(result).toHaveProperty("error");
  });

  it("returns error when user not found", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@b.com" } } as any);
    mockSend.mockResolvedValue({ Item: null } as any);
    expect(await changePasswordAction({ currentPassword: "old", newPassword: "newPass1!", confirmPassword: "newPass1!" }))
      .toEqual({ error: "User not found." });
  });

  it("returns error for incorrect current password", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@b.com" } } as any);
    mockSend.mockResolvedValue({ Item: { passwordHash: "hash" } } as any);
    mockBcrypt.compare.mockResolvedValue(false as any);
    expect(await changePasswordAction({ currentPassword: "wrong", newPassword: "newPass1!", confirmPassword: "newPass1!" }))
      .toEqual({ error: "Current password is incorrect." });
  });

  it("updates password on success", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@b.com" } } as any);
    mockSend
      .mockResolvedValueOnce({ Item: { passwordHash: "hash" } } as any)
      .mockResolvedValueOnce({} as any);
    mockBcrypt.compare.mockResolvedValue(true as any);
    expect(await changePasswordAction({ currentPassword: "old", newPassword: "newPass1!", confirmPassword: "newPass1!" }))
      .toEqual({ success: true });
  });

  it("returns internal error when DB throws", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@b.com" } } as any);
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await changePasswordAction({ currentPassword: "old", newPassword: "newPass1!", confirmPassword: "newPass1!" }))
      .toHaveProperty("error");
  });
});

describe("forgotPasswordAction", () => {
  it("returns error for invalid email", async () => {
    expect(await forgotPasswordAction({ email: "bad" })).toHaveProperty("error");
  });

  it("returns success message when user not found (privacy)", async () => {
    mockSend.mockResolvedValue({ Item: null } as any);
    const result = await forgotPasswordAction({ email: "a@b.com" });
    expect(result).toHaveProperty("success", true);
  });

  it("returns unverified error when email not verified", async () => {
    mockSend.mockResolvedValue({ Item: { emailVerified: false } } as any);
    expect(await forgotPasswordAction({ email: "a@b.com" })).toEqual({ error: "unverified" });
  });

  it("sends email and returns success for verified user", async () => {
    mockSend
      .mockResolvedValueOnce({ Item: { emailVerified: true } } as any)
      .mockResolvedValueOnce({} as any)
      .mockResolvedValueOnce({} as any);
    sesStub.send.mockResolvedValueOnce({});
    const result = await forgotPasswordAction({ email: "a@b.com" });
    expect(result).toHaveProperty("success", true);
  });

  it("returns error when SES throws", async () => {
    mockSend
      .mockResolvedValueOnce({ Item: { emailVerified: true } } as any)
      .mockResolvedValueOnce({} as any)
      .mockResolvedValueOnce({} as any);
    sesStub.send.mockRejectedValueOnce(new Error("SES error"));
    expect(await forgotPasswordAction({ email: "a@b.com" })).toHaveProperty("error", "Failed to dispatch email.");
  });

  it("returns internal error when outer try throws", async () => {
    mockSend.mockRejectedValue(new Error("unexpected"));
    expect(await forgotPasswordAction({ email: "a@b.com" })).toHaveProperty("error", "Internal server error");
  });
});

describe("validateResetTokenAction", () => {
  it("returns invalid when token not found", async () => {
    mockSend.mockResolvedValue({ Item: null } as any);
    const result = await validateResetTokenAction("bad-token");
    expect(result).toMatchObject({ error: expect.any(String), reason: "invalid" });
  });

  it("returns expired when token is past expiry", async () => {
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: "2020-01-01T00:00:00.000Z" } } as any)
      .mockResolvedValueOnce({} as any); // DeleteCommand
    const result = await validateResetTokenAction("expired-token");
    expect(result).toMatchObject({ reason: "expired" });
  });

  it("returns superseded when token is not the latest", async () => {
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: new Date(Date.now() + 3600000).toISOString() } } as any)
      .mockResolvedValueOnce({ Item: { latestResetToken: "different-token" } } as any);
    const result = await validateResetTokenAction("old-token");
    expect(result).toMatchObject({ reason: "superseded" });
  });

  it("returns success for a valid token", async () => {
    const token = "valid-token";
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: new Date(Date.now() + 3600000).toISOString() } } as any)
      .mockResolvedValueOnce({ Item: { latestResetToken: token } } as any);
    const result = await validateResetTokenAction(token);
    expect(result).toHaveProperty("success", true);
  });

  it("returns account not found when user record missing", async () => {
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: new Date(Date.now() + 3600000).toISOString() } } as any)
      .mockResolvedValueOnce({ Item: null } as any);
    const result = await validateResetTokenAction("token");
    expect(result).toMatchObject({ reason: "invalid" });
  });
});

describe("resetPasswordAction", () => {
  it("returns error for invalid input", async () => {
    mockSend.mockResolvedValue({ Item: null } as any);
    expect(await resetPasswordAction("t", { password: "short", confirmPassword: "short" })).toHaveProperty("error");
  });

  it("returns error when token not found", async () => {
    mockSend.mockResolvedValue({ Item: null } as any);
    expect(await resetPasswordAction("bad", { password: "newPass1!", confirmPassword: "newPass1!" })).toHaveProperty("error");
  });

  it("returns error when token expired", async () => {
    mockSend.mockResolvedValue({ Item: { email: "a@b.com", expiresAt: "2020-01-01T00:00:00.000Z" } } as any);
    const result = await resetPasswordAction("expired", { password: "newPass1!", confirmPassword: "newPass1!" });
    expect(result).toHaveProperty("error");
  });

  it("returns error when user not found", async () => {
    const token = "valid";
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: new Date(Date.now() + 3600000).toISOString() } } as any)
      .mockResolvedValueOnce({ Item: null } as any);
    expect(await resetPasswordAction(token, { password: "newPass1!", confirmPassword: "newPass1!" })).toHaveProperty("error");
  });

  it("returns error when token superseded", async () => {
    const token = "valid";
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: new Date(Date.now() + 3600000).toISOString() } } as any)
      .mockResolvedValueOnce({ Item: { latestResetToken: "other-token" } } as any);
    expect(await resetPasswordAction(token, { password: "newPass1!", confirmPassword: "newPass1!" })).toHaveProperty("error");
  });

  it("resets password successfully", async () => {
    const token = "valid";
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: new Date(Date.now() + 3600000).toISOString() } } as any)
      .mockResolvedValueOnce({ Item: { latestResetToken: token } } as any)
      .mockResolvedValueOnce({} as any) // UpdateCommand
      .mockResolvedValueOnce({} as any); // DeleteCommand
    expect(await resetPasswordAction(token, { password: "newPass1!", confirmPassword: "newPass1!" })).toEqual({ success: true });
  });
});

describe("verifyEmailToken", () => {
  it("returns invalid when token not found", async () => {
    mockSend.mockResolvedValue({ Item: null } as any);
    const result = await verifyEmailToken("bad");
    expect(result).toMatchObject({ reason: "invalid" });
  });

  it("returns expired when token past expiry", async () => {
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: "2020-01-01T00:00:00.000Z" } } as any)
      .mockResolvedValueOnce({} as any);
    const result = await verifyEmailToken("expired");
    expect(result).toMatchObject({ reason: "expired" });
  });

  it("returns superseded when token is not the latest", async () => {
    const token = "old";
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: new Date(Date.now() + 3600000).toISOString() } } as any)
      .mockResolvedValueOnce({ Item: { latestVerifyToken: "newer" } } as any);
    const result = await verifyEmailToken(token);
    expect(result).toMatchObject({ reason: "superseded" });
  });

  it("returns account not found when user missing", async () => {
    const token = "t";
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: new Date(Date.now() + 3600000).toISOString() } } as any)
      .mockResolvedValueOnce({ Item: null } as any);
    expect(await verifyEmailToken(token)).toHaveProperty("error");
  });

  it("verifies token and returns autoLoginToken", async () => {
    const token = "valid";
    mockSend
      .mockResolvedValueOnce({ Item: { email: "a@b.com", expiresAt: new Date(Date.now() + 3600000).toISOString() } } as any)
      .mockResolvedValueOnce({ Item: { latestVerifyToken: token } } as any)
      .mockResolvedValueOnce({} as any) // UpdateCommand
      .mockResolvedValueOnce({} as any) // DeleteCommand
      .mockResolvedValueOnce({} as any); // PutCommand autoLogin
    const result = await verifyEmailToken(token);
    expect(result).toHaveProperty("success", true);
    expect(typeof (result as any).autoLoginToken).toBe("string");
  });
});

describe("resendVerificationEmail", () => {
  it("returns error when user not found", async () => {
    mockSend.mockResolvedValue({ Item: null } as any);
    expect(await resendVerificationEmail("a@b.com")).toHaveProperty("error");
  });

  it("returns error when already verified", async () => {
    mockSend.mockResolvedValue({ Item: { emailVerified: true } } as any);
    expect(await resendVerificationEmail("a@b.com")).toHaveProperty("error");
  });

  it("resends email for unverified user", async () => {
    mockSend
      .mockResolvedValueOnce({ Item: { emailVerified: false } } as any)
      .mockResolvedValueOnce({} as any)
      .mockResolvedValueOnce({} as any);
    sesStub.send.mockResolvedValueOnce({});
    expect(await resendVerificationEmail("a@b.com")).toHaveProperty("success", true);
  });

  it("returns internal error when DB throws", async () => {
    mockSend.mockRejectedValue(new Error("fail"));
    expect(await resendVerificationEmail("a@b.com")).toHaveProperty("error", "Internal server error");
  });
});

describe("deleteAccount", () => {
  it("returns Unauthorized when not logged in", async () => {
    mockAuth.mockResolvedValue(null as any);
    expect(await deleteAccount()).toEqual({ error: "Unauthorized" });
  });

  it("deletes account when profile has no verify token", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } } as any);
    mockDeletePartition.mockResolvedValue(undefined as any);
    mockSend
      .mockResolvedValueOnce({ Item: null } as any)  // GetCommand — no latestVerifyToken
      .mockResolvedValueOnce({} as any);              // DeleteCommand profile
    mockSignOut.mockResolvedValue(undefined as any);
    expect(await deleteAccount()).toEqual({ success: true });
  });

  it("deletes verify token when profile has latestVerifyToken", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } } as any);
    mockDeletePartition.mockResolvedValue(undefined as any);
    mockSend
      .mockResolvedValueOnce({ Item: { latestVerifyToken: "old-token" } } as any)
      .mockResolvedValueOnce({} as any)  // DeleteCommand verify token
      .mockResolvedValueOnce({} as any); // DeleteCommand profile
    mockSignOut.mockResolvedValue(undefined as any);
    expect(await deleteAccount()).toEqual({ success: true });
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it("returns error when DB throws", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } } as any);
    mockDeletePartition.mockRejectedValue(new Error("fail"));
    expect(await deleteAccount()).toHaveProperty("error");
  });
});

describe("sendVerificationEmail", () => {
  it("sends email and returns success", async () => {
    mockSend
      .mockResolvedValueOnce({} as any)   // PutCommand verify token
      .mockResolvedValueOnce({} as any);  // UpdateCommand user
    sesStub.send.mockResolvedValueOnce({});
    expect(await sendVerificationEmail("a@b.com")).toEqual({ success: true });
  });

  it("returns error when SES throws", async () => {
    mockSend
      .mockResolvedValueOnce({} as any)
      .mockResolvedValueOnce({} as any);
    sesStub.send.mockRejectedValueOnce(new Error("SES error"));
    expect(await sendVerificationEmail("a@b.com")).toHaveProperty("error", "Failed to send verification email. Please try again.");
  });

  it("returns internal error when outer DB throws", async () => {
    mockSend.mockRejectedValue(new Error("DB fail"));
    expect(await sendVerificationEmail("a@b.com")).toHaveProperty("error", "Internal server error");
  });
});

describe("verifyEmailToken (additional paths)", () => {
  it("returns internal server error when DB throws", async () => {
    mockSend.mockRejectedValue(new Error("unexpected"));
    expect(await verifyEmailToken("t")).toHaveProperty("error", "Internal server error");
  });
});

describe("resetPasswordAction (additional paths)", () => {
  it("returns internal error when outer try throws", async () => {
    mockSend.mockRejectedValue(new Error("unexpected"));
    expect(await resetPasswordAction("t", { password: "newPass1!", confirmPassword: "newPass1!" }))
      .toHaveProperty("error");
  });
});

describe("validateResetTokenAction (additional paths)", () => {
  it("returns internal error when DB throws", async () => {
    mockSend.mockRejectedValue(new Error("unexpected"));
    expect(await validateResetTokenAction("t")).toHaveProperty("error");
  });
});

describe("changePasswordAction (additional paths)", () => {
  it("returns internal error when DB throws", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@b.com" } } as any);
    mockSend.mockRejectedValue(new Error("unexpected"));
    expect(await changePasswordAction({ currentPassword: "old", newPassword: "newPass1!", confirmPassword: "newPass1!" }))
      .toHaveProperty("error", "Internal server error");
  });
});
