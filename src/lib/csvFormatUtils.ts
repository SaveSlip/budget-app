export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type AmountConvention = "negative-expense" | "positive-expense" | "type-column";

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
    const typeVal = (typeColValue ?? "").toLowerCase();
    transactionType =
      typeVal.includes("debit") || typeVal.includes("expense") ? "EXPENSE" : "INCOME";
  } else if (convention === "positive-expense") {
    transactionType = "EXPENSE";
  } else {
    // "negative-expense": sign determines type
    transactionType = numeric < 0 ? "EXPENSE" : "INCOME";
  }

  return { amount, transactionType };
}
