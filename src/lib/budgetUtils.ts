import type { Transaction } from "./data/budget";

export function monthToQuarter(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${year}-Q${Math.ceil(m / 3)}`;
}

export function computeCategorySpending(transactions: Transaction[]): Record<string, number> {
  const spending: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.transactionType === "EXPENSE" && tx.category) {
      const amount = Math.abs(Number(tx.amount) || 0);
      spending[tx.category] = (spending[tx.category] || 0) + amount;
    }
  }
  return spending;
}
