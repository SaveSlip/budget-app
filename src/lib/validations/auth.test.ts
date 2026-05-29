import { describe, it, expect } from "vitest";
import {
  signinSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./auth";

describe("signinSchema", () => {
  it("accepts valid email + password", () => {
    expect(signinSchema.safeParse({ email: "a@b.com", password: "secret" }).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(signinSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });

  it("rejects empty password", () => {
    expect(signinSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const base = { email: "user@example.com", password: "Password1!", confirmPassword: "Password1!" };

  it("accepts matching passwords of 8+ chars", () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });

  it("rejects password shorter than 8 chars", () => {
    expect(signupSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    expect(signupSchema.safeParse({ ...base, confirmPassword: "Different1!" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(signupSchema.safeParse({ ...base, email: "bad" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });

  it("rejects non-email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "abc" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching 8+ char passwords", () => {
    expect(resetPasswordSchema.safeParse({ password: "newPass1!", confirmPassword: "newPass1!" }).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    expect(resetPasswordSchema.safeParse({ password: "newPass1!", confirmPassword: "other1234!" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const base = { currentPassword: "oldPass1!", newPassword: "newPass1!", confirmPassword: "newPass1!" };

  it("accepts valid change", () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
  });

  it("rejects missing current password", () => {
    expect(changePasswordSchema.safeParse({ ...base, currentPassword: "" }).success).toBe(false);
  });

  it("rejects mismatched new and confirm", () => {
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: "wrong123!" }).success).toBe(false);
  });

  it("rejects new password under 8 chars", () => {
    expect(changePasswordSchema.safeParse({ ...base, newPassword: "short", confirmPassword: "short" }).success).toBe(false);
  });
});
