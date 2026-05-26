import { docClient, TABLE_NAME } from "@/lib/db";
import { QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { auth } from "@/auth";
import { UNIVERSAL_CATEGORIES, UNIVERSAL_INCOME_CATEGORIES } from "@/lib/constants/categories";
import { format, subMonths } from "date-fns";

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
  isUniversal?: boolean;
  categoryType?: "INCOME" | "EXPENSE";
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
  addedByUserId?: string;
  createdAt: string;
}

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getMonthlyData(month: string): Promise<Transaction[]> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized");

  const transactions: Transaction[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  try {
    do {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
          ExpressionAttributeValues: {
            ":pk": `USER#${userId}`,
            ":skPrefix": `TX#${month}`,
          },
          ScanIndexForward: false,
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      );
      if (result.Items) transactions.push(...result.Items as Transaction[]);
      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    return transactions;
  } catch (error) {
    console.error("[DAL] Monthly data fetch failed:", error);
    return [];
  }
}

export async function getCategories(month?: string): Promise<Category[]> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized");

  const quarter = monthToQuarter(month ?? format(new Date(), "yyyy-MM"));

  try {
    const categoryResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":skPrefix": "CATEGORY#",
        },
      }),
    );

    const customCategories = (categoryResult.Items ?? []).filter((item) => item.name) as Category[];

    // Fetch quarter-scoped and base limit records in one batch
    const universalIds = UNIVERSAL_CATEGORIES.map((uc) => uc.id);
    const customIds = customCategories.map((c) => c.id);

    const batchKeys = [
      ...universalIds.flatMap((id) => [
        { pk: `USER#${userId}`, sk: `UNIVERSAL_LIMIT#${id}#${quarter}` },
        { pk: `USER#${userId}`, sk: `UNIVERSAL_LIMIT#${id}` },
      ]),
      ...customIds.map((id) => ({ pk: `USER#${userId}`, sk: `CATEGORY_LIMIT#${id}#${quarter}` })),
    ];

    const batchItems = await batchGetItems(batchKeys);

    const universalQuarterLimits = new Map<string, number>();
    const universalBaseLimits = new Map<string, number>();
    const customQuarterLimits = new Map<string, number>();

    for (const item of batchItems) {
      const sk = item.sk as string;
      const id = item.id as string;
      const limit = item.limit as number;
      if (sk.startsWith("UNIVERSAL_LIMIT#")) {
        // Quarter record has two '#' separators; base record has one
        const parts = sk.split("#");
        if (parts.length === 3) {
          universalQuarterLimits.set(id, limit);
        } else {
          universalBaseLimits.set(id, limit);
        }
      } else if (sk.startsWith("CATEGORY_LIMIT#")) {
        customQuarterLimits.set(id, limit);
      }
    }

    const universalNames = new Set(UNIVERSAL_CATEGORIES.map((uc) => uc.name.toLowerCase()));
    const filteredCustom = customCategories.filter(
      (c) => !universalNames.has(c.name.toLowerCase())
    );

    const universals: Category[] = UNIVERSAL_CATEGORIES.map((uc) => ({
      id: uc.id,
      name: uc.name,
      limit: universalQuarterLimits.get(uc.id) ?? universalBaseLimits.get(uc.id) ?? 0,
      type: "CATEGORY",
      createdAt: "",
      isUniversal: true,
      categoryType: "EXPENSE" as const,
    }));

    const universalIncome: Category[] = UNIVERSAL_INCOME_CATEGORIES.map((uc) => ({
      id: uc.id,
      name: uc.name,
      limit: 0,
      type: "CATEGORY",
      createdAt: "",
      isUniversal: true,
      categoryType: "INCOME" as const,
    }));

    return [
      ...universals,
      ...universalIncome,
      ...filteredCustom.map((c) => ({
        ...c,
        limit: customQuarterLimits.get(c.id) ?? c.limit ?? 0,
        isUniversal: false,
        categoryType: (c.categoryType ?? "EXPENSE") as "INCOME" | "EXPENSE",
      })),
    ];
  } catch (error) {
    console.error("[DAL] Categories fetch failed:", error);
    return [];
  }
}

export async function getAccounts(): Promise<Account[]> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized");

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
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

export interface RecurringTransaction {
  pk: string;
  sk: string;
  id: string;
  type: "RECURRING";
  description: string;
  amount: number;
  category: string;
  transactionType: "INCOME" | "EXPENSE";
  accountId?: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  dayOfMonth?: number;
  nextRunDate: string;
  isActive: boolean;
  createdAt: string;
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
  isUniversal: boolean;
}

function getPreviousMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthToQuarter(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${year}-Q${Math.ceil(m / 3)}`;
}

export function currentQuarter(): string {
  return monthToQuarter(format(new Date(), "yyyy-MM"));
}

async function batchGetItems(
  keys: Array<{ pk: string; sk: string }>
): Promise<Record<string, unknown>[]> {
  if (keys.length === 0) return [];
  const chunks: Array<typeof keys> = [];
  for (let i = 0; i < keys.length; i += 100) chunks.push(keys.slice(i, i + 100));
  const results = await Promise.all(
    chunks.map((chunk) =>
      docClient.send(
        new BatchGetCommand({ RequestItems: { [TABLE_NAME]: { Keys: chunk } } })
      )
    )
  );
  return results.flatMap((r) => r.Responses?.[TABLE_NAME] ?? []) as Record<string, unknown>[];
}

function computeCategorySpending(transactions: Transaction[]): Record<string, number> {
  const spending: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.transactionType === "EXPENSE" && tx.category) {
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
    getCategories(month),
  ]);

  const categorySpending = computeCategorySpending(transactions);
  const prevCategorySpending = computeCategorySpending(prevTransactions);

  let totalIncome = 0;
  let totalExpenses = 0;
  for (const tx of transactions) {
    const amount = Math.abs(Number(tx.amount) || 0);
    const txType = tx.transactionType ?? "EXPENSE";
    if (txType === "INCOME") {
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
    adjustedCategoryLimits[cat.name] = cat.limit || 0;
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
        isUniversal: cat.isUniversal ?? false,
      });
    }
  }

  return suggestions;
}

export interface YearlyBalance {
  year: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  categorySpending: Record<string, number>;
  transactions: Transaction[];
}

export async function getYearlyBalance(year: string): Promise<YearlyBalance> {
  const months = Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, "0")}`
  );
  const results = await Promise.all(months.map(getMonthlyData));
  const allTransactions = results.flat().sort((a, b) => b.date.localeCompare(a.date));

  let totalIncome = 0;
  let totalExpenses = 0;
  const categorySpending: Record<string, number> = {};

  for (const tx of allTransactions) {
    const amount = Math.abs(Number(tx.amount) || 0);
    const txType = tx.transactionType ?? "EXPENSE";
    if (txType === "INCOME") {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
      if (tx.category) {
        categorySpending[tx.category] = (categorySpending[tx.category] || 0) + amount;
      }
    }
  }

  return {
    year,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    categorySpending,
    transactions: allTransactions,
  };
}

export async function getAllMonthsBalance(): Promise<MonthlyBalance> {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => format(subMonths(now, i), "yyyy-MM"));
  const [results, categories] = await Promise.all([
    Promise.all(months.map(getMonthlyData)),
    getCategories(),
  ]);
  const allTransactions = results.flat();

  let totalIncome = 0;
  let totalExpenses = 0;
  const categorySpending: Record<string, number> = {};

  for (const tx of allTransactions) {
    const amount = Math.abs(Number(tx.amount) || 0);
    const txType = tx.transactionType ?? "EXPENSE";
    if (txType === "INCOME") {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
      if (tx.category) {
        categorySpending[tx.category] = (categorySpending[tx.category] || 0) + amount;
      }
    }
  }

  const adjustedCategoryLimits: Record<string, number> = {};
  for (const cat of categories) {
    adjustedCategoryLimits[cat.name] = cat.limit || 0;
  }

  const totalAllocated = categories.reduce((sum, c) => sum + (c.limit || 0), 0);

  return {
    month: "all",
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    categorySpending,
    totalAllocated,
    unallocated: totalIncome - totalAllocated,
    adjustedCategoryLimits,
    rolloverDeltas: {},
  };
}

export async function getAllYearsBalance(): Promise<YearlyBalance> {
  const currentYear = Number(format(new Date(), "yyyy"));
  const years = [0, 1, 2, 3].map((i) => String(currentYear - i));
  const results = await Promise.all(years.map(getYearlyBalance));

  let totalIncome = 0;
  let totalExpenses = 0;
  const categorySpending: Record<string, number> = {};
  const allTransactions: Transaction[] = [];

  for (const r of results) {
    totalIncome += r.totalIncome;
    totalExpenses += r.totalExpenses;
    for (const [cat, amount] of Object.entries(r.categorySpending)) {
      categorySpending[cat] = (categorySpending[cat] || 0) + amount;
    }
    allTransactions.push(...r.transactions);
  }

  allTransactions.sort((a, b) => b.date.localeCompare(a.date));

  return {
    year: "all",
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    categorySpending,
    transactions: allTransactions,
  };
}

export async function getTransactionTrend(
  monthsBack: number = 6,
): Promise<Transaction[]> {
  const now = new Date();
  const months = Array.from({ length: monthsBack }, (_, i) =>
    format(subMonths(now, i), "yyyy-MM"),
  );

  try {
    const results = await Promise.all(months.map((m) => getMonthlyData(m)));
    return results.flat().sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return b.createdAt.localeCompare(a.createdAt);
    });
  } catch (error) {
    console.error("[DAL] Trend fetch failed:", error);
    return [];
  }
}

