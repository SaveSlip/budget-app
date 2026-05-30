import { describe, it, expect } from "vitest";
import {
  normalizeAccountNumber,
  detectAccountNumberFromCsv,
  matchAccountByNumber,
  ACCOUNT_NUMBER_ALIASES,
} from "./accountMatching";
import type { Account } from "./data/budget";

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: "acc-1",
  name: "Chequing",
  accountType: "CHECKING",
  initialBalance: 0,
  accountNumber: "1234",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("normalizeAccountNumber", () => {
  it("returns last 4 digits of a full card number", () => {
    expect(normalizeAccountNumber("4111 1111 1111 1234")).toBe("1234");
  });

  it("returns last 4 from a plain 16-digit number", () => {
    expect(normalizeAccountNumber("4111111111111234")).toBe("1234");
  });

  it("returns the only digits when fewer than 4 present", () => {
    expect(normalizeAccountNumber("AB9")).toBe("9");
  });

  it("returns null for a string with no digits", () => {
    expect(normalizeAccountNumber("no digits here")).toBeNull();
  });

  it("strips all non-digit characters before extracting", () => {
    expect(normalizeAccountNumber("xxxx-xxxx-xxxx-5678")).toBe("5678");
  });

  it("handles a 4-digit string directly", () => {
    expect(normalizeAccountNumber("5678")).toBe("5678");
  });
});

describe("detectAccountNumberFromCsv", () => {
  it("detects a recognised column header and returns the value", () => {
    const headers = ["Date", "Amount", "Account Number"];
    const firstRow = { Date: "2026-01-01", Amount: "50.00", "Account Number": "1234" };
    const result = detectAccountNumberFromCsv(headers, firstRow);
    expect(result).toEqual({ columnName: "Account Number", value: "1234" });
  });

  it("is case-insensitive for header matching", () => {
    const headers = ["card last 4"];
    const firstRow = { "card last 4": "9876" };
    const result = detectAccountNumberFromCsv(headers, firstRow);
    expect(result).toEqual({ columnName: "card last 4", value: "9876" });
  });

  it("returns null when no recognised column exists", () => {
    const headers = ["Date", "Merchant", "Total"];
    const firstRow = { Date: "2026-01-01", Merchant: "Shop", Total: "10.00" };
    expect(detectAccountNumberFromCsv(headers, firstRow)).toBeNull();
  });

  it("returns null when the recognised column has an empty value", () => {
    const headers = ["account number"];
    const firstRow = { "account number": "" };
    expect(detectAccountNumberFromCsv(headers, firstRow)).toBeNull();
  });

  it("returns null when the recognised column key is absent from firstRow", () => {
    const headers = ["account number"];
    const firstRow: Record<string, string> = {};
    expect(detectAccountNumberFromCsv(headers, firstRow)).toBeNull();
  });

  it("covers all known alias strings", () => {
    for (const alias of ACCOUNT_NUMBER_ALIASES) {
      const headers = [alias];
      const firstRow = { [alias]: "0001" };
      expect(detectAccountNumberFromCsv(headers, firstRow)).not.toBeNull();
    }
  });
});

describe("matchAccountByNumber", () => {
  const accounts: Account[] = [
    makeAccount({ id: "a1", accountNumber: "4111111111111234" }),
    makeAccount({ id: "a2", accountNumber: "5678" }),
  ];

  it("matches by last 4 digits", () => {
    const match = matchAccountByNumber("1234", accounts);
    expect(match?.id).toBe("a1");
  });

  it("matches when csvValue is a full card number", () => {
    const match = matchAccountByNumber("4111111111115678", accounts);
    expect(match?.id).toBe("a2");
  });

  it("returns null when no account matches", () => {
    expect(matchAccountByNumber("9999", accounts)).toBeNull();
  });

  it("returns null when csvValue has no digits", () => {
    expect(matchAccountByNumber("N/A", accounts)).toBeNull();
  });

  it("skips accounts without an accountNumber field", () => {
    const noNumAccounts: Account[] = [makeAccount({ accountNumber: undefined })];
    expect(matchAccountByNumber("1234", noNumAccounts)).toBeNull();
  });
});
