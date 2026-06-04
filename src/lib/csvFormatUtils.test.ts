import { describe, it, expect } from "vitest";
import { parseDate, parseAmount, parseSplitAmount, inferTypeFromDescription, corroborateType, isSlashDate } from "./csvFormatUtils";

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
    it("DR → EXPENSE", () => {
      expect(parseAmount("50", "type-column", "DR")).toEqual({ amount: "50", transactionType: "EXPENSE" });
    });
    it("CR → INCOME", () => {
      expect(parseAmount("50", "type-column", "CR")).toEqual({ amount: "50", transactionType: "INCOME" });
    });
    it("W → EXPENSE", () => {
      expect(parseAmount("50", "type-column", "W")).toEqual({ amount: "50", transactionType: "EXPENSE" });
    });
    it("D → EXPENSE", () => {
      expect(parseAmount("50", "type-column", "D")).toEqual({ amount: "50", transactionType: "EXPENSE" });
    });
    it("C → INCOME", () => {
      expect(parseAmount("50", "type-column", "C")).toEqual({ amount: "50", transactionType: "INCOME" });
    });
    it("withdrawal → EXPENSE", () => {
      expect(parseAmount("50", "type-column", "withdrawal")).toEqual({ amount: "50", transactionType: "EXPENSE" });
    });
  });
});

describe("parseSplitAmount", () => {
  it("expense non-zero, income zero → EXPENSE", () => {
    expect(parseSplitAmount("3.67", "")).toEqual({ amount: "3.67", transactionType: "EXPENSE" });
  });
  it("income non-zero, expense zero → INCOME", () => {
    expect(parseSplitAmount("", "350.00")).toEqual({ amount: "350", transactionType: "INCOME" });
  });
  it("both zero → EXPENSE with amount 0", () => {
    expect(parseSplitAmount("", "")).toEqual({ amount: "0", transactionType: "EXPENSE" });
  });
  it("both non-zero → larger wins (expense >= income → EXPENSE)", () => {
    expect(parseSplitAmount("100", "50")).toEqual({ amount: "100", transactionType: "EXPENSE" });
  });
  it("both non-zero → larger wins (income > expense → INCOME)", () => {
    expect(parseSplitAmount("50", "100")).toEqual({ amount: "100", transactionType: "INCOME" });
  });
  it("strips currency symbols", () => {
    expect(parseSplitAmount("$1,234.56", "")).toEqual({ amount: "1234.56", transactionType: "EXPENSE" });
  });
  it("handles whitespace-only strings as zero", () => {
    expect(parseSplitAmount("   ", "860.76")).toEqual({ amount: "860.76", transactionType: "INCOME" });
  });
});

describe("inferTypeFromDescription", () => {
  it("RETAIL PURCHASE → EXPENSE", () => {
    expect(inferTypeFromDescription("VISA DEBIT RETAIL PURCHASE TESLA 602709")).toBe("EXPENSE");
  });
  it("ATM WITHDRAWAL → EXPENSE", () => {
    expect(inferTypeFromDescription("ATM WITHDRAWAL STEVESTON 5 RD")).toBe("EXPENSE");
  });
  it("PREAUTHORIZED DEBIT → EXPENSE", () => {
    expect(inferTypeFromDescription("PREAUTHORIZED DEBIT Telus Mobility")).toBe("EXPENSE");
  });
  it("SERVICE CHARGE → EXPENSE", () => {
    expect(inferTypeFromDescription("SERVICE CHARGE CAPPED MONTHLY FEE$16.95")).toBe("EXPENSE");
  });
  it("DEPOSIT → INCOME", () => {
    expect(inferTypeFromDescription("DEPOSIT Uber Holdings Canad")).toBe("INCOME");
  });
  it("PAY followed by payroll → INCOME", () => {
    expect(inferTypeFromDescription("PAY Ibex Payroll Services")).toBe("INCOME");
  });
  it("GST/HST → INCOME", () => {
    expect(inferTypeFromDescription("DEPOSIT TPS/GST")).toBe("INCOME");
  });
  it("E-TRANSFER without direction → null (ambiguous)", () => {
    expect(inferTypeFromDescription("Internet Banking E-TRANSFER 105803132741 inder jandu")).toBe(null);
  });
  it("INTERNET TRANSFER → null (ambiguous)", () => {
    expect(inferTypeFromDescription("Internet Banking INTERNET TRANSFER 000000118422")).toBe(null);
  });
});

describe("corroborateType", () => {
  it("column EXPENSE, description signals EXPENSE → not flagged", () => {
    expect(corroborateType("EXPENSE", "VISA DEBIT RETAIL PURCHASE TESLA")).toEqual({ transactionType: "EXPENSE", flagged: false });
  });
  it("column INCOME, description signals INCOME → not flagged", () => {
    expect(corroborateType("INCOME", "DEPOSIT Uber Holdings")).toEqual({ transactionType: "INCOME", flagged: false });
  });
  it("column EXPENSE, ambiguous description → not flagged", () => {
    expect(corroborateType("EXPENSE", "Internet Banking E-TRANSFER 105803132741 inder jandu")).toEqual({ transactionType: "EXPENSE", flagged: false });
  });
  it("column INCOME, description signals EXPENSE → flagged, column type wins", () => {
    expect(corroborateType("INCOME", "VISA DEBIT RETAIL PURCHASE TESLA")).toEqual({ transactionType: "INCOME", flagged: true });
  });
  it("column EXPENSE, description signals INCOME → flagged, column type wins", () => {
    expect(corroborateType("EXPENSE", "DEPOSIT Uber Holdings")).toEqual({ transactionType: "EXPENSE", flagged: true });
  });
});
