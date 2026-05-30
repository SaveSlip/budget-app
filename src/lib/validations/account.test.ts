import { describe, it, expect } from "vitest";
import { accountSchema } from "./account";

describe("accountSchema", () => {
  const valid = { name: "Chequing", type: "CHECKING" as const, initialBalance: 500 };

  it("accepts a valid account", () => {
    expect(accountSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults initialBalance to 0 when omitted", () => {
    const { initialBalance: _, ...noBalance } = valid;
    const result = accountSchema.safeParse(noBalance);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.initialBalance).toBe(0);
  });

  it("rejects empty account name", () => {
    expect(accountSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects an invalid account type", () => {
    expect(accountSchema.safeParse({ ...valid, type: "LOAN" }).success).toBe(false);
  });

  it.each(["CHECKING", "SAVINGS", "CREDIT", "CASH", "INVESTMENT", "OTHER"] as const)(
    "accepts type %s",
    (type) => {
      expect(accountSchema.safeParse({ ...valid, type }).success).toBe(true);
    },
  );

  it("accepts an optional accountNumber up to 20 chars", () => {
    const result = accountSchema.safeParse({ ...valid, accountNumber: "1234" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.accountNumber).toBe("1234");
  });

  it("rejects accountNumber exceeding 20 chars", () => {
    expect(accountSchema.safeParse({ ...valid, accountNumber: "a".repeat(21) }).success).toBe(false);
  });
});
