import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AnimateSection } from "@/components/AnimateSection";
import {
  getMonthlyBalance,
  getAllMonthsBalance,
  getCategories,
  getTransactionTrend,
  getQuarterlyReview,
  getYearlyBalance,
  getAllYearsBalance,
  type Transaction,
  type Category,
  type CategoryReviewSuggestion,
} from "@/lib/data/budget";
import { SummaryCard } from "@/components/SummaryCard";
import { BudgetBenchmarking } from "@/components/BudgetBenchmarking";
import { GlassCard } from "@/components/GlassCard";
import { MonthlyChart } from "@/components/MonthlyChart";
import { DashboardFilters } from "@/components/DashboardFilters";
import { QuarterlyReview } from "@/components/QuarterlyReview";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { RecentTransactions } from "@/components/RecentTransactions";
import Link from "next/link";
import { format } from "date-fns";

interface PageProps {
  searchParams: Promise<{ month?: string; q?: string; view?: string; year?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const resolvedParams = await searchParams;
  const q = resolvedParams.q || "";
  const activeMonth = resolvedParams.month || format(new Date(), "yyyy-MM");
  const view = resolvedParams.view === "yearly" ? "yearly" : "monthly";
  const activeYear = resolvedParams.year || format(new Date(), "yyyy");

  let categories: Category[];
  let totalIncome: number;
  let totalExpenses: number;
  let netCashFlow: number;
  let spendingMap: Record<string, number>;
  let adjustedCategoryLimits: Record<string, number>;
  let rolloverDeltas: Record<string, number>;
  let trendItems: Transaction[];
  let quarterlyReview: CategoryReviewSuggestion[];

  if (view === "yearly") {
    const [cats, yearlyBalance] = await Promise.all([
      getCategories(),
      activeYear === "all" ? getAllYearsBalance() : getYearlyBalance(activeYear),
    ]);
    categories = cats;
    totalIncome = yearlyBalance.totalIncome;
    totalExpenses = yearlyBalance.totalExpenses;
    netCashFlow = yearlyBalance.balance;
    spendingMap = yearlyBalance.categorySpending;
    adjustedCategoryLimits = Object.fromEntries(
      cats.map((c) => [c.name, (c.limit || 0) * (activeYear === "all" ? 48 : 12)])
    );
    rolloverDeltas = {};
    trendItems = yearlyBalance.transactions;
    quarterlyReview = [];
  } else {
    const [cats, monthlyBalance, trend, quarterly] = await Promise.all([
      getCategories(),
      activeMonth === "all" ? getAllMonthsBalance() : getMonthlyBalance(activeMonth),
      getTransactionTrend(12),
      activeMonth === "all" ? Promise.resolve([]) : getQuarterlyReview(activeMonth),
    ]);
    categories = cats;
    totalIncome = monthlyBalance.totalIncome;
    totalExpenses = monthlyBalance.totalExpenses;
    netCashFlow = monthlyBalance.balance;
    spendingMap = monthlyBalance.categorySpending;
    adjustedCategoryLimits = monthlyBalance.adjustedCategoryLimits;
    rolloverDeltas = monthlyBalance.rolloverDeltas;
    trendItems = trend;
    quarterlyReview = quarterly;
  }

  const periodLabel =
    view === "yearly"
      ? activeYear === "all" ? "across all years" : `in ${activeYear}`
      : activeMonth === "all" ? "across all months" : "this period";

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto space-y-8">
      {/* Header & Global Filters */}
      <AnimateSection delay={0}>
        <DashboardFilters />
      </AnimateSection>

      {/* Row 1: Stats */}
      <AnimateSection delay={0.08}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Total Income"
            value={`$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description={q ? `Results for "${q}"` : `Income ${periodLabel}`}
            type="income"
          />
          <SummaryCard
            title="Total Expenses"
            value={`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description={q ? `Results for "${q}"` : `Expenses ${periodLabel}`}
            type="expense"
          />
          <SummaryCard
            title="Net Cash Flow"
            value={`${netCashFlow >= 0 ? "+" : ""}$${Math.abs(netCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description={netCashFlow >= 0 ? "Positive cash flow" : "Negative cash flow"}
            type={netCashFlow >= 0 ? "income" : "expense"}
          />
        </div>
      </AnimateSection>

      {/* Quarterly Budget Review */}
      {quarterlyReview.length > 0 && (
        <AnimateSection delay={0.12}>
          <QuarterlyReview suggestions={quarterlyReview} />
        </AnimateSection>
      )}

      {/* Row 2: Budget Benchmarking */}
      <AnimateSection delay={0.16}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-semibold text-foreground">
              Budget Benchmarking
            </h3>
            <AddCategoryDialog />
          </div>
          <BudgetBenchmarking
            categories={categories
              .filter((c) => c.categoryType !== "INCOME")
              .sort((a, b) => {
                const spentA = spendingMap[a.name] || 0;
                const spentB = spendingMap[b.name] || 0;
                const limitA = adjustedCategoryLimits[a.name] ?? a.limit ?? 0;
                const limitB = adjustedCategoryLimits[b.name] ?? b.limit ?? 0;
                const pctA = limitA > 0 ? spentA / limitA : spentA > 0 ? Infinity : 0;
                const pctB = limitB > 0 ? spentB / limitB : spentB > 0 ? Infinity : 0;
                return pctB - pctA;
              })}
            spendingMap={spendingMap}
            adjustedCategoryLimits={adjustedCategoryLimits}
            rolloverDeltas={rolloverDeltas}
          />
        </div>
      </AnimateSection>

      {/* Recent Transactions */}
      <AnimateSection delay={0.20}>
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
            <Link
              href={`/dashboard/transactions?month=${activeMonth}&view=${view}&year=${activeYear}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <RecentTransactions
              transactions={trendItems.slice(0, 8)}
              categories={categories}
            />
          </div>
        </GlassCard>
      </AnimateSection>

      {/* Row 3: Spending Activity Chart */}
      <AnimateSection delay={0.24}>
        <GlassCard title={view === "yearly" ? `Monthly Breakdown — ${activeYear}` : "12-Month Spending Activity"}>
          <div className="w-full">
            <MonthlyChart transactions={trendItems} year={view === "yearly" ? activeYear : undefined} />
          </div>
        </GlassCard>
      </AnimateSection>
    </div>
  );
}
