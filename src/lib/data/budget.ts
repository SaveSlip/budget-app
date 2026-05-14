import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/db";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export interface Account {
  id: string;
  name: string;
  accountType: "CHECKING" | "SAVINGS" | "CREDIT" | "CASH" | "INVESTMENT" | "OTHER";
  initialBalance: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  limit: number;
  type: string;
  createdAt: string;
}

export interface Transaction {
  pk: string;
  sk: string;
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: string;
  transactionType?: "INCOME" | "EXPENSE";
  accountId?: string;
  createdAt: string;
}

export async function getMonthlyData(month: string): Promise<Transaction[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${session.user.id}`,
          ":skPrefix": `TX#${month}`,
        },
        ScanIndexForward: false,
      }),
    );
    return (result.Items ?? []) as Transaction[];
  } catch (error) {
    console.error("[DAL] Monthly data fetch failed:", error);
    return [];
  }
}

export async function getCategories(): Promise<Category[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${session.user.id}`,
          ":skPrefix": "CATEGORY#",
        },
      }),
    );
    return (result.Items ?? []) as Category[];
  } catch (error) {
    console.error("[DAL] Categories fetch failed:", error);
    return [];
  }
}

export async function getAccounts(): Promise<Account[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${session.user.id}`,
          ":skPrefix": "ACCOUNT#",
        },
      }),
    );
    return (result.Items ?? []) as Account[];
  } catch (error) {
    console.error("[DAL] Accounts fetch failed:", error);
    return [];
  }
}

export interface MonthlyBalance {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  categorySpending: Record<string, number>;
  totalAllocated: number;
  unallocated: number;
  adjustedCategoryLimits: Record<string, number>;
  rolloverDeltas: Record<string, number>;
}

export interface CategoryReviewSuggestion {
  categoryId: string;
  categoryName: string;
  currentLimit: number;
  avgMonthlySpend: number;
  suggestedLimit: number;
  action: "increase" | "decrease";
}

function getPreviousMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function computeCategorySpending(transactions: Transaction[]): Record<string, number> {
  const spending: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.transactionType !== "INCOME" && tx.category) {
      const amount = Math.abs(Number(tx.amount) || 0);
      spending[tx.category] = (spending[tx.category] || 0) + amount;
    }
  }
  return spending;
}

export async function getMonthlyBalance(month: string): Promise<MonthlyBalance> {
  const prevMonth = getPreviousMonth(month);
  const [transactions, prevTransactions, categories] = await Promise.all([
    getMonthlyData(month),
    getMonthlyData(prevMonth),
    getCategories(),
  ]);

  const categorySpending = computeCategorySpending(transactions);
  const prevCategorySpending = computeCategorySpending(prevTransactions);

  let totalIncome = 0;
  let totalExpenses = 0;
  for (const tx of transactions) {
    const amount = Math.abs(Number(tx.amount) || 0);
    if (tx.transactionType === "INCOME") {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
    }
  }

  const adjustedCategoryLimits: Record<string, number> = {};
  const rolloverDeltas: Record<string, number> = {};

  for (const cat of categories) {
    const prevSpend = prevCategorySpending[cat.name];
    const delta = prevSpend !== undefined ? (cat.limit || 0) - prevSpend : 0;
    rolloverDeltas[cat.name] = delta;
    adjustedCategoryLimits[cat.name] = Math.max(0, (cat.limit || 0) + delta);
  }

  const totalAllocated = categories.reduce((sum, c) => sum + (c.limit || 0), 0);

  return {
    month,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    categorySpending,
    totalAllocated,
    unallocated: totalIncome - totalAllocated,
    adjustedCategoryLimits,
    rolloverDeltas,
  };
}

export async function getQuarterlyReview(
  currentMonth: string,
): Promise<CategoryReviewSuggestion[]> {
  const [year, m] = currentMonth.split("-").map(Number);
  // Only trigger on quarter-start months: Jan(1), Apr(4), Jul(7), Oct(10)
  if (m % 3 !== 1) return [];

  const months = [1, 2, 3].map((offset) => {
    const date = new Date(year, m - 1 - offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });

  const [txMonth1, txMonth2, txMonth3, categories] = await Promise.all([
    getMonthlyData(months[0]),
    getMonthlyData(months[1]),
    getMonthlyData(months[2]),
    getCategories(),
  ]);

  const allSpending = [txMonth1, txMonth2, txMonth3].map(computeCategorySpending);

  const suggestions: CategoryReviewSuggestion[] = [];

  for (const cat of categories) {
    const limit = cat.limit || 0;
    const spends = allSpending.map((s) => s[cat.name] ?? 0);
    const avg = spends.reduce((a, b) => a + b, 0) / 3;

    let action: "increase" | "decrease" | "keep" = "keep";
    let suggestedLimit = limit;

    if (avg > limit) {
      action = "increase";
      suggestedLimit = Math.ceil(avg * 1.1);
    } else if (avg < limit * 0.7) {
      action = "decrease";
      suggestedLimit = Math.ceil(avg * 1.1);
    }

    if (action !== "keep") {
      suggestions.push({
        categoryId: cat.id,
        categoryName: cat.name,
        currentLimit: limit,
        avgMonthlySpend: Math.round(avg * 100) / 100,
        suggestedLimit,
        action,
      });
    }
  }

  return suggestions;
}

export async function getTransactionTrend(
  monthsBack: number = 6,
): Promise<Transaction[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND sk BETWEEN :startSk AND :endSk",
        ExpressionAttributeValues: {
          ":pk": `USER#${session.user.id}`,
          ":startSk": `TX#${startDate.toISOString().split("T")[0]}`,
          ":endSk": `TX#${endDate.toISOString().split("T")[0]}#\uffff`,
        },
      }),
    );
    return (result.Items ?? []) as Transaction[];
  } catch (error) {
    console.error("[DAL] Trend fetch failed:", error);
    return [];
  }
}
