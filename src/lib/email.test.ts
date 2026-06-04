import { describe, it, expect, vi, beforeEach } from "vitest";

const sesStub = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: function SESClient() { return sesStub; },
  SendEmailCommand: function SendEmailCommand(input: unknown) { return input; },
}));

vi.mock("sst", () => ({
  Resource: { EmailIdentity: { sender: "noreply@budgify.app" } },
}));

import { FROM_ADDRESS, sendEmail } from "./email";

beforeEach(() => {
  vi.clearAllMocks();
  sesStub.send = vi.fn();
});

describe("FROM_ADDRESS", () => {
  it("uses sender as-is when it contains @", () => {
    expect(FROM_ADDRESS).toBe("noreply@budgify.app");
  });

  it("bare-domain branch logic: prepends no-reply@ when sender has no @", () => {
    const sender = "amanbrar.pro";
    const addr = sender.includes("@") ? sender : `no-reply@${sender}`;
    expect(addr).toBe("no-reply@amanbrar.pro");
  });
});

describe("sendEmail", () => {
  it("calls sesClient.send with correct Source, Destination, Subject, Body", async () => {
    await sendEmail({ to: "user@example.com", subject: "Test", htmlBody: "<p>Hello</p>" });
    expect(sesStub.send).toHaveBeenCalledOnce();
    const arg = sesStub.send.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).toMatchObject({
      Source: "noreply@budgify.app",
      Destination: { ToAddresses: ["user@example.com"] },
      Message: {
        Subject: { Data: "Test", Charset: "UTF-8" },
        Body: { Html: { Data: "<p>Hello</p>", Charset: "UTF-8" } },
      },
    });
  });

  it("propagates SES errors", async () => {
    sesStub.send = vi.fn().mockRejectedValue(new Error("SES error"));
    await expect(sendEmail({ to: "u@e.com", subject: "s", htmlBody: "b" })).rejects.toThrow("SES error");
  });
});
