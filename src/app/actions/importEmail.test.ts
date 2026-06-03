import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { sendImportSuccessEmail, sendImportFailureEmail } from "./importEmail";
import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";

const mockAuth = vi.mocked(auth);
const mockSendEmail = vi.mocked(sendEmail);

beforeEach(() => vi.clearAllMocks());

describe("sendImportSuccessEmail", () => {
  it("calls sendEmail with correct to, singular subject, and HTML count", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@example.com" } } as never);
    await sendImportSuccessEmail(1);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const opts = mockSendEmail.mock.calls[0][0];
    expect(opts.to).toBe("user@example.com");
    expect(opts.subject).toBe("Budgify — 1 transaction imported");
    expect(opts.htmlBody).toContain("1");
    expect(opts.htmlBody).toContain("was added");
  });

  it("uses plural subject and body for count > 1", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@example.com" } } as never);
    await sendImportSuccessEmail(42);
    const opts = mockSendEmail.mock.calls[0][0];
    expect(opts.subject).toBe("Budgify — 42 transactions imported");
    expect(opts.htmlBody).toContain("were added");
  });

  it("does not call sendEmail when session has no email", async () => {
    mockAuth.mockResolvedValue({ user: {} } as never);
    await sendImportSuccessEmail(5);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not call sendEmail when session is null", async () => {
    mockAuth.mockResolvedValue(null as never);
    await sendImportSuccessEmail(5);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("sendImportFailureEmail", () => {
  it("calls sendEmail with failure subject and error message in HTML", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@example.com" } } as never);
    await sendImportFailureEmail("Something went wrong");
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const opts = mockSendEmail.mock.calls[0][0];
    expect(opts.to).toBe("user@example.com");
    expect(opts.subject).toBe("Budgify — CSV import failed");
    expect(opts.htmlBody).toContain("Something went wrong");
  });

  it("does not call sendEmail when session has no email", async () => {
    mockAuth.mockResolvedValue({ user: {} } as never);
    await sendImportFailureEmail("err");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not call sendEmail when session is null", async () => {
    mockAuth.mockResolvedValue(null as never);
    await sendImportFailureEmail("err");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
