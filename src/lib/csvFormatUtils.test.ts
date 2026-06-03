import { describe, it, expect } from "vitest";
import { parseDate, parseAmount, isSlashDate } from "./csvFormatUtils";

describe("isSlashDate", () => {
  it("returns true for M/D/YYYY", () => expect(isSlashDate("4/2/2026")).toBe(true));
  it("returns true for MM/DD/YYYY", () => expect(isSlashDate("04/02/2026")).toBe(true));
  it("returns true for MM/D/YYYY", () => expect(isSlashDate("04/2/2026")).toBe(true));
  it("returns false for ISO date", () => expect(isSlashDate("2026-04-02")).toBe(false));
  it("returns false for ISO datetime", () => expect(isSlashDate("2026-04-02T10:00:00Z")).toBe(false));
  it("returns false for empty string", () => expect(isSlashDate("")).toBe(false));
});

describe("parseDate", () => {
  describe("MM/DD/YYYY", () => {
    it("parses single-digit month and day", () => {
      expect(parseDate("4/2/2026", "MM/DD/YYYY")).toBe("2026-04-02");
    });
    it("parses zero-padded month and day", () => {
      expect(parseDate("04/06/2026", "MM/DD/YYYY")).toBe("2026-04-06");
    });
    it("passes through ISO datetime by stripping time", () => {
      expect(parseDate("2026-04-06T10:00:00Z", "MM/DD/YYYY")).toBe("2026-04-06");
    });
    it("passes through plain ISO date string", () => {
      expect(parseDate("2026-04-06", "MM/DD/YYYY")).toBe("2026-04-06");
    });
  });

  describe("DD/MM/YYYY", () => {
    it("swaps day and month correctly", () => {
      expect(parseDate("04/06/2026", "DD/MM/YYYY")).toBe("2026-06-04");
    });
    it("parses single-digit day and month", () => {
      expect(parseDate("2/4/2026", "DD/MM/YYYY")).toBe("2026-04-02");
    });
  });

  describe("YYYY-MM-DD", () => {
    it("passes through ISO date unchanged", () => {
      expect(parseDate("2026-04-06", "YYYY-MM-DD")).toBe("2026-04-06");
    });
    it("strips time from ISO datetime", () => {
      expect(parseDate("2026-04-06T14:30:00Z", "YYYY-MM-DD")).toBe("2026-04-06");
    });
    it("passes through slash dates without conversion when format is ISO", () => {
      // Slash dates with YYYY-MM-DD format selected just pass through as-is
      expect(parseDate("04/06/2026", "YYYY-MM-DD")).toBe("04/06/2026");
    });
  });
});

describe("parseAmount", () => {
  describe("negative-expense convention", () => {
    it("negative number → EXPENSE", () => {
      expect(parseAmount("-50.00", "negative-expense")).toEqual({ amount: "50", transactionType: "EXPENSE" });
    });
    it("positive number → INCOME", () => {
      expect(parseAmount("1000", "negative-expense")).toEqual({ amount: "1000", transactionType: "INCOME" });
    });
    it("parenthetical amount treated as negative → EXPENSE", () => {
      expect(parseAmount("(50.00)", "negative-expense")).toEqual({ amount: "50", transactionType: "EXPENSE" });
    });
    it("zero → EXPENSE with amount 0", () => {
      expect(parseAmount("0", "negative-expense")).toEqual({ amount: "0", transactionType: "INCOME" });
    });
    it("strips currency symbols", () => {
      expect(parseAmount("-$1,234.56", "negative-expense")).toEqual({ amount: "1234.56", transactionType: "EXPENSE" });
    });
  });

  describe("positive-expense convention", () => {
    it("positive number → EXPENSE", () => {
      expect(parseAmount("50.00", "positive-expense")).toEqual({ amount: "50", transactionType: "EXPENSE" });
    });
    it("all values are EXPENSE regardless of sign", () => {
      expect(parseAmount("-50.00", "positive-expense")).toEqual({ amount: "50", transactionType: "EXPENSE" });
    });
  });

  describe("type-column convention", () => {
    it("debit type → EXPENSE", () => {
      expect(parseAmount("50", "type-column", "Debit")).toEqual({ amount: "50", transactionType: "EXPENSE" });
    });
    it("credit type → INCOME", () => {
      expect(parseAmount("50", "type-column", "Credit")).toEqual({ amount: "50", transactionType: "INCOME" });
    });
    it("expense type → EXPENSE", () => {
      expect(parseAmount("50", "type-column", "expense")).toEqual({ amount: "50", transactionType: "EXPENSE" });
    });
    it("missing typeColValue → INCOME", () => {
      expect(parseAmount("50", "type-column", undefined)).toEqual({ amount: "50", transactionType: "INCOME" });
    });
  });
});
