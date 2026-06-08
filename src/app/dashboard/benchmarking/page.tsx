import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  getCategories,
  getMonthlyBalance,
  getMonthlyData,
  getYearlyBalance,
  getAllMonthsBalance,
  getAllYearsBalance,
  getTransactionTrend,
  type Category,
  type Transaction,
} from "@/lib/data/budget";
import { getAvailableMonths } from "@/app/actions/transactions";
import { BenchmarkingPage } from "@/components/BenchmarkingPage";

interface PageProps {
  searchParams: Promise<{ month?: string; view?: string; year?: string; category?: string }>;
}

function getPrevMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function BenchmarkingPageRoute({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const [resolved, availableMonths] = await Promise.all([searchParams, getAvailableMonths()]);
  const todayMonth = format(new Date(), "yyyy-MM");
  const defaultMonth = availableMonths.includes(todayMonth) ? todayMonth : (availableMonths[0] ?? todayMonth);
  const activeMonth = resolved.month || defaultMonth;
  const view = resolved.view === "yearly" ? "yearly" : "monthly";
  const activeYear = resolved.year || format(new Date(), "yyyy");
  const initialCategory = resolved.category;

  function computeSpending(txs: Transaction[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const tx of txs) {
      if (tx.transactionType === "EXPENSE" && tx.category) {
        map[tx.category] = (map[tx.category] || 0) + Math.abs(Number(tx.amount) || 0);
      }
    }
    return map;
  }

  if (view === "yearly") {
    const isAllYears = activeYear === "all";
    const [categories, yearlyBalance, prevYearlyBalance] = await Promise.all([
      getCategories(),
      isAllYears ? getAllYearsBalance() : getYearlyBalance(activeYear),
      isAllYears ? Promise.resolve({ categorySpending: {} }) : getYearlyBalance(String(Number(activeYear) - 1)),
    ]);

    const yearMultiplier = isAllYears ? 48 : 12;
    const expenseCategories: Category[] = categories
      .filter((c) => c.categoryType !== "INCOME")
      .sort((a, b) => {
        const spentA = yearlyBalance.categorySpending[a.name] || 0;
        const spentB = yearlyBalance.categorySpending[b.name] || 0;
        const limitA = (a.limit ?? 0) * yearMultiplier;
        const limitB = (b.limit ?? 0) * yearMultiplier;
        const pctA = limitA > 0 ? spentA / limitA : spentA > 0 ? Infinity : 0;
        const pctB = limitB > 0 ? spentB / limitB : spentB > 0 ? Infinity : 0;
        return pctB - pctA;
      });

    const yearlyLimits: Record<string, number> = {};
    for (const cat of expenseCategories) {
      yearlyLimits[cat.name] = (cat.limit ?? 0) * yearMultiplier;
    }

    const expenseTxs = yearlyBalance.transactions.filter((tx) => tx.transactionType === "EXPENSE");

    return (
      <BenchmarkingPage
        categories={expenseCategories}
        spendingMap={yearlyBalance.categorySpending}
        adjustedCategoryLimits={yearlyLimits}
        rolloverDeltas={{}}
        prevSpendingMap={prevYearlyBalance.categorySpending}
        sparklineData={{}}
        sparkMonths={["", "", ""]}
        transactions={expenseTxs}
        availableMonths={availableMonths}
        activeMonth={activeMonth}
        activeYear={activeYear}
        view={view}
        initialCategory={initialCategory}
      />
    );
  }

  const isAllMonths = activeMonth === "all";

  if (isAllMonths) {
    const [categories, allBalance, allTxs] = await Promise.all([
      getCategories(),
      getAllMonthsBalance(),
      getTransactionTrend(12),
    ]);

    const expenseCategories: Category[] = categories
      .filter((c) => c.categoryType !== "INCOME")
      .sort((a, b) => {
        const spentA = allBalance.categorySpending[a.name] || 0;
        const spentB = allBalance.categorySpending[b.name] || 0;
        const limitA = allBalance.adjustedCategoryLimits[a.name] ?? a.limit ?? 0;
        const limitB = allBalance.adjustedCategoryLimits[b.name] ?? b.limit ?? 0;
        const pctA = limitA > 0 ? spentA / limitA : spentA > 0 ? Infinity : 0;
        const pctB = limitB > 0 ? spentB / limitB : spentB > 0 ? Infinity : 0;
        return pctB - pctA;
      });

    const expenseTxs = allTxs.filter((tx) => tx.transactionType === "EXPENSE");

    return (
      <BenchmarkingPage
        categories={expenseCategories}
        spendingMap={allBalance.categorySpending}
        adjustedCategoryLimits={allBalance.adjustedCategoryLimits}
        rolloverDeltas={{}}
        prevSpendingMap={{}}
        sparklineData={{}}
        sparkMonths={["", "", ""]}
        transactions={expenseTxs}
        availableMonths={availableMonths}
        activeMonth={activeMonth}
        activeYear={activeYear}
        view={view}
        initialCategory={initialCategory}
      />
    );
  }

  const prevMonth1 = getPrevMonth(activeMonth);
  const prevMonth2 = getPrevMonth(prevMonth1);

  const [categories, currentBalance, prevBalance, transactions, sparkMonth2Txs, sparkMonth3Txs] =
    await Promise.all([
      getCategories(activeMonth),
      getMonthlyBalance(activeMonth),
      getMonthlyBalance(prevMonth1),
      getMonthlyData(activeMonth),
      getMonthlyData(prevMonth1),
      getMonthlyData(prevMonth2),
    ]);

  const expenseCategories: Category[] = categories
    .filter((c) => c.categoryType !== "INCOME")
    .sort((a, b) => {
      const spentA = currentBalance.categorySpending[a.name] || 0;
      const spentB = currentBalance.categorySpending[b.name] || 0;
      const limitA = currentBalance.adjustedCategoryLimits[a.name] ?? a.limit ?? 0;
      const limitB = currentBalance.adjustedCategoryLimits[b.name] ?? b.limit ?? 0;
      const pctA = limitA > 0 ? spentA / limitA : spentA > 0 ? Infinity : 0;
      const pctB = limitB > 0 ? spentB / limitB : spentB > 0 ? Infinity : 0;
      return pctB - pctA;
    });

  const sparklineData: Record<string, [number, number, number]> = {};
  const spark1 = computeSpending(sparkMonth3Txs);
  const spark2 = computeSpending(sparkMonth2Txs);
  const spark3 = currentBalance.categorySpending;
  for (const cat of expenseCategories) {
    sparklineData[cat.name] = [spark1[cat.name] ?? 0, spark2[cat.name] ?? 0, spark3[cat.name] ?? 0];
  }

  const expenseTxs = transactions.filter((tx) => tx.transactionType === "EXPENSE");

  return (
    <BenchmarkingPage
      categories={expenseCategories}
      spendingMap={currentBalance.categorySpending}
      adjustedCategoryLimits={currentBalance.adjustedCategoryLimits}
      rolloverDeltas={currentBalance.rolloverDeltas}
      prevSpendingMap={prevBalance.categorySpending}
      sparklineData={sparklineData}
      sparkMonths={[prevMonth2, prevMonth1, activeMonth]}
      transactions={expenseTxs}
      availableMonths={availableMonths}
      activeMonth={activeMonth}
      activeYear={activeYear}
      view={view}
      initialCategory={initialCategory}
    />
  );
}
