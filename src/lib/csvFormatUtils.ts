export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type AmountConvention = "negative-expense" | "positive-expense" | "type-column" | "split-columns";

export interface FormatOptions {
  dateFormat: DateFormat;
  amountConvention: AmountConvention;
}

export function isSlashDate(raw: string): boolean {
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw.trim());
}

export function parseDate(raw: string, format: DateFormat): string {
  const trimmed = raw.trim();

  if (format === "YYYY-MM-DD") {
    // ISO datetime: strip time component
    return trimmed.includes("T") ? trimmed.split("T")[0] : trimmed;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;
    const month = format === "MM/DD/YYYY" ? a : b;
    const day = format === "MM/DD/YYYY" ? b : a;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // ISO datetime passthrough for non-ISO format selections
  if (trimmed.includes("T")) return trimmed.split("T")[0];

  return trimmed;
}

export function parseAmount(
  raw: string,
  convention: AmountConvention,
  typeColValue?: string,
): { amount: string; transactionType: "INCOME" | "EXPENSE" } {
  // Strip parentheses used by some banks for negative amounts: (50.00) → -50.00
  const normalized = raw.trim().replace(/^\((.+)\)$/, "-$1");
  const numeric = Number(normalized.replace(/[^0-9.-]+/g, ""));
  const amount = numeric === 0 ? "0" : Math.abs(numeric).toString();

  let transactionType: "INCOME" | "EXPENSE";

  if (convention === "type-column") {
    const typeVal = (typeColValue ?? "").toLowerCase().trim();
    const expenseTypeValues = ["debit", "expense", "dr", "d", "w", "withdrawal", "debit memo"];
    const incomeTypeValues = ["credit", "income", "cr", "c", "deposit", "credit memo"];
    if (expenseTypeValues.includes(typeVal)) {
      transactionType = "EXPENSE";
    } else if (incomeTypeValues.includes(typeVal)) {
      transactionType = "INCOME";
    } else {
      transactionType = typeVal.includes("debit") || typeVal.includes("expense") ? "EXPENSE" : "INCOME";
    }
  } else if (convention === "positive-expense") {
    transactionType = "EXPENSE";
  } else {
    // "negative-expense": sign determines type
    transactionType = numeric < 0 ? "EXPENSE" : "INCOME";
  }

  return { amount, transactionType };
}

function parseNumeric(raw: string): number {
  const normalized = raw.trim().replace(/^\((.+)\)$/, "-$1");
  return Number(normalized.replace(/[^0-9.-]+/g, ""));
}

export function parseSplitAmount(
  expenseRaw: string,
  incomeRaw: string,
): { amount: string; transactionType: "INCOME" | "EXPENSE" } {
  const expense = parseNumeric(expenseRaw);
  const income = parseNumeric(incomeRaw);

  if (expense > 0 && income <= 0) {
    return { amount: expense.toString(), transactionType: "EXPENSE" };
  }
  if (income > 0 && expense <= 0) {
    return { amount: income.toString(), transactionType: "INCOME" };
  }
  if (expense > 0 && income > 0) {
    // Both populated (unusual) — larger value wins, default EXPENSE on tie
    return expense >= income
      ? { amount: expense.toString(), transactionType: "EXPENSE" }
      : { amount: income.toString(), transactionType: "INCOME" };
  }
  return { amount: "0", transactionType: "EXPENSE" };
}

const EXPENSE_DESCRIPTION_SIGNALS = [
  "retail purchase",
  "purchase",
  "withdrawal",
  "atm withdrawal",
  "preauthorized debit",
  "pre-authorized debit",
  "direct debit",
  "service charge",
  "monthly fee",
  "interest charge",
  "over limit fee",
  "fee",
  "payment to",
  "transfer to",
  "bill payment",
  "safety deposit box",
];

const INCOME_DESCRIPTION_SIGNALS = [
  "deposit",
  "direct deposit",
  "payroll",
  "pay ",
  "transfer from",
  "e-transfer received",
  "refund",
  "government",
  "gst",
  "hst",
  "benefit",
];

export function inferTypeFromDescription(
  description: string,
): "INCOME" | "EXPENSE" | null {
  const lower = description.toLowerCase();

  for (const signal of EXPENSE_DESCRIPTION_SIGNALS) {
    if (lower.includes(signal)) return "EXPENSE";
  }
  for (const signal of INCOME_DESCRIPTION_SIGNALS) {
    if (lower.includes(signal)) return "INCOME";
  }
  return null;
}

export function corroborateType(
  columnType: "INCOME" | "EXPENSE",
  description: string,
): { transactionType: "INCOME" | "EXPENSE"; flagged: boolean } {
  const inferred = inferTypeFromDescription(description);
  const flagged = inferred !== null && inferred !== columnType;
  return { transactionType: columnType, flagged };
}
