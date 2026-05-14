import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AnimateSection } from "@/components/AnimateSection";
import {
  getMonthlyData,
  getCategories,
  getTransactionTrend,
  getAccounts,
  type Transaction,
} from "@/lib/data/budget";
import { SummaryCard } from "@/components/SummaryCard";
import { BudgetProgress } from "@/components/BudgetProgress";
import { GlassCard } from "@/components/GlassCard";
import { MonthlyChart } from "@/components/MonthlyChart";
import { DashboardFilters } from "@/components/DashboardFilters";
import { LogPanel } from "@/components/LogPanel";
import { format } from "date-fns";

interface PageProps {
  searchParams: Promise<{ month?: string; q?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const resolvedParams = await searchParams;
  const q = resolvedParams.q || "";
  const activeMonth = resolvedParams.month || format(new Date(), "yyyy-MM");

  const [currentItems, categories, trendItems, accounts] = await Promise.all([
    getMonthlyData(activeMonth),
    getCategories(),
    getTransactionTrend(12),
    getAccounts(),
  ]);

  const filteredTransactions: Transaction[] = currentItems.filter((tx) => {
    if (!q) return true;
    const searchStr = q.toLowerCase();
    return (
      tx.description?.toLowerCase().includes(searchStr) ||
      tx.category?.toLowerCase().includes(searchStr)
    );
  });

  const spendingMap: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpenses = 0;

  filteredTransactions.forEach((item) => {
    const amount = Math.abs(Number(item.amount) || 0);
    if (item.transactionType === "INCOME") {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
      if (item.category) {
        spendingMap[item.category] = (spendingMap[item.category] || 0) + amount;
      }
    }
  });

  const netCashFlow = totalIncome - totalExpenses;

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto space-y-8">
      {/* Header & Global Filters */}
      <AnimateSection delay={0}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Financial Command Center
              </h2>
              <p className="text-muted-foreground font-mono uppercase text-xs tracking-tighter">
                Period: {activeMonth} {q ? `• Search: "${q}"` : ""}
              </p>
            </div>
          </div>

          <DashboardFilters />
        </div>
      </AnimateSection>

      {/* Row 1: Stats */}
      <AnimateSection delay={0.08}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Total Income"
            value={`$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description={q ? `Results for "${q}"` : "Income this period"}
            type="income"
          />
          <SummaryCard
            title="Total Expenses"
            value={`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            description={q ? `Results for "${q}"` : "Expenses this period"}
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

      {/* Row 2: Budget Benchmarking (left) & Log Transaction (right) */}
      <AnimateSection delay={0.16}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground px-1">
              Budget Benchmarking
            </h3>
            <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
              {categories.map((category) => (
                <BudgetProgress
                  key={category.id}
                  categoryName={category.name}
                  limit={category.limit || 0}
                  spent={spendingMap[category.name] || 0}
                />
              ))}
            </div>
          </div>

          <GlassCard title="Log Transaction">
            <LogPanel categories={categories} accounts={accounts} />
          </GlassCard>
        </div>
      </AnimateSection>

      {/* Row 3: 12-Month Spending Activity */}
      <AnimateSection delay={0.24}>
        <GlassCard title="12-Month Spending Activity">
          <div className="w-full">
            <MonthlyChart transactions={trendItems} />
          </div>
        </GlassCard>
      </AnimateSection>
    </div>
  );
}
