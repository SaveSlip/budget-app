import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAvailableMonths } from "@/app/actions/transactions";
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
import { BudgetBenchmarking, PAGE_SIZE } from "@/components/BudgetBenchmarking";
import { GlassCard } from "@/components/GlassCard";
import { MonthlyChart } from "@/components/MonthlyChart";
import { DashboardFilters } from "@/components/DashboardFilters";
import { QuarterlyReview } from "@/components/QuarterlyReview";
import { RecentTransactions } from "@/components/RecentTransactions";
import { EmptyDashboardCta } from "@/components/EmptyDashboardCta";
import Link from "next/link";
import { format } from "date-fns";

interface PageProps {
  searchParams: Promise<{ month?: string; q?: string; view?: string; year?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const [resolvedParams, availableMonths] = await Promise.all([searchParams, getAvailableMonths()]);

  const todayMonth = format(new Date(), "yyyy-MM");
  if (resolvedParams.view !== "yearly" && !resolvedParams.month && availableMonths.length > 0 && !availableMonths.includes(todayMonth)) {
    redirect(`/dashboard?month=${availableMonths[0]}`);
  }

  const activeMonth = resolvedParams.month || todayMonth;
  const view = resolvedParams.view === "yearly" ? "yearly" : "monthly";
  const activeYear = resolvedParams.year || format(new Date(), "yyyy");
  const searchQuery = resolvedParams.q?.trim() ?? "";

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

  const benchmarkCategories = categories
    .filter((c) => c.categoryType !== "INCOME")
    .sort((a, b) => {
      const spentA = spendingMap[a.name] || 0;
      const spentB = spendingMap[b.name] || 0;
      const limitA = adjustedCategoryLimits[a.name] ?? a.limit ?? 0;
      const limitB = adjustedCategoryLimits[b.name] ?? b.limit ?? 0;
      const pctA = limitA > 0 ? spentA / limitA : spentA > 0 ? Infinity : 0;
      const pctB = limitB > 0 ? spentB / limitB : spentB > 0 ? Infinity : 0;
      return pctB - pctA;
    });
  const hiddenBenchmarkCount = benchmarkCategories.length - PAGE_SIZE;
  const benchmarkHref = `/dashboard/benchmarking?month=${activeMonth}&view=${view}&year=${activeYear}`;

  const filteredItems = searchQuery
    ? trendItems.filter((tx) => {
        const q = searchQuery.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q)
        );
      })
    : trendItems;

  const displayItems = searchQuery ? filteredItems : filteredItems.slice(0, 8);

  const periodLabel =
    view === "yearly"
      ? activeYear === "all" ? "across all years" : `in ${activeYear}`
      : activeMonth === "all" ? "across all months" : "this period";

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto space-y-8">
      {/* Header & Global Filters */}
      <AnimateSection delay={0}>
        <DashboardFilters availableMonths={availableMonths} userId={session.user.id!} />
      </AnimateSection>

      {/* First-time user onboarding CTA */}
      {availableMonths.length === 0 && (
        <AnimateSection delay={0.04}>
          <EmptyDashboardCta />
        </AnimateSection>
      )}

      {/* Row 1: Stats */}
      <AnimateSection delay={0.08}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Total Income"
            value={`$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description={`Income ${periodLabel}`}
            type="income"
          />
          <SummaryCard
            title="Total Expenses"
            value={`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description={`Expenses ${periodLabel}`}
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
            <Link
              href={benchmarkHref}
              className="text-xl font-semibold text-foreground hover:text-primary transition-colors"
            >
              Budget Benchmarking
            </Link>
            {hiddenBenchmarkCount > 0 && (
              <Link
                href={benchmarkHref}
                className="text-sm font-medium text-primary hover:underline"
              >
                Show {hiddenBenchmarkCount} more →
              </Link>
            )}
          </div>
          <BudgetBenchmarking
            categories={benchmarkCategories}
            spendingMap={spendingMap}
            adjustedCategoryLimits={adjustedCategoryLimits}
            rolloverDeltas={rolloverDeltas}
            activeMonth={activeMonth}
            activeYear={activeYear}
            view={view}
          />
        </div>
      </AnimateSection>

      {/* Recent Transactions */}
      <div id="recent-transactions">
      <AnimateSection delay={0.20}>
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {searchQuery
                ? `Results for "${searchQuery}" (${filteredItems.length})`
                : "Recent Transactions"}
            </h3>
            <Link
              href={`/dashboard/transactions?month=${searchQuery ? "all" : activeMonth}&view=${view}&year=${searchQuery ? "all" : activeYear}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <RecentTransactions
              transactions={displayItems}
              categories={categories}
              scrollable={!!searchQuery}
              emptyMessage={searchQuery ? `No transactions match "${searchQuery}".` : undefined}
            />
          </div>
        </GlassCard>
      </AnimateSection>
      </div>

      {/* Row 3: Spending Activity Chart */}
      <AnimateSection delay={0.24}>
        <GlassCard title={view === "yearly" ? `Monthly Breakdown — ${activeYear}` : "12-Month Spending Activity"}>
          <div className="w-full">
            <MonthlyChart transactions={trendItems} year={view === "yearly" && activeYear !== "all" ? activeYear : undefined} />
          </div>
        </GlassCard>
      </AnimateSection>
    </div>
  );
}
