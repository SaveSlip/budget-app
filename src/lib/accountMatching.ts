import type { Account } from "@/lib/data/budget";

export const ACCOUNT_NUMBER_ALIASES = [
  "account number",
  "account no",
  "account #",
  "acct number",
  "acct no",
  "card number",
  "card no",
  "card last 4",
  "last 4",
  "last four",
  "account",
];

/**
 * Extracts the last 4 digits from a raw account number string.
 * Returns null if no 4-digit sequence is found.
 */
export function normalizeAccountNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  if (digits.length > 0) return digits;
  return null;
}

/**
 * Detects an account number column in CSV headers and extracts the value
 * from the first data row. Returns null if no recognizable column exists.
 */
export function detectAccountNumberFromCsv(
  headers: string[],
  firstRow: Record<string, string>,
): { columnName: string; value: string } | null {
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (ACCOUNT_NUMBER_ALIASES.includes(normalized)) {
      const value = (firstRow[header] ?? "").trim();
      if (value) return { columnName: header, value };
    }
  }
  return null;
}

/**
 * Matches a raw CSV account number value against the user's existing accounts.
 * Compares normalized last-4 digits. Returns the matching Account or null.
 */
export function matchAccountByNumber(
  csvValue: string,
  accounts: Account[],
): Account | null {
  const csvLast4 = normalizeAccountNumber(csvValue);
  if (!csvLast4) return null;

  for (const account of accounts) {
    if (!account.accountNumber) continue;
    const accountLast4 = normalizeAccountNumber(account.accountNumber);
    if (accountLast4 && accountLast4 === csvLast4) return account;
  }
  return null;
}
