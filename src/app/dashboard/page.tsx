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
import { CashFlowChart } from "@/components/CashFlowChart";
import { RecentTransactions } from "@/components/RecentTransactions";
import { CategoryForm } from "@/components/CategoryForm";
import { DashboardFilters } from "@/components/DashboardFilters";
import TransactionForm from "@/components/TransactionForm";
import CsvUploader from "@/components/CsvUploader";
import { AccountForm } from "@/components/AccountForm";
import { AccountBalances } from "@/components/AccountBalances";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    getTransactionTrend(6),
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <SummaryCard
            title="Transaction Count"
            value={filteredTransactions.length.toString()}
            description="Matches found"
            type="balance"
          />
        </div>
      </AnimateSection>

      {/* Row 2: Budget Benchmarking & Quick Log */}
      <AnimateSection delay={0.16}>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-7">
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-xl font-semibold text-foreground px-1">
              Budget Benchmarking
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {categories.map((category) => (
                <BudgetProgress
                  key={category.id}
                  categoryName={category.name}
                  limit={category.limit || 0}
                  spent={spendingMap[category.name] || 0}
                />
              ))}
            </div>

            <GlassCard title="Add New Budget Category">
              <CategoryForm />
            </GlassCard>
          </div>

          <GlassCard title="Log Transaction" className="lg:col-span-3">
            <TransactionForm categories={categories} accounts={accounts} />
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Bulk Import
              </p>
              <CsvUploader />
            </div>
          </GlassCard>
        </div>
      </AnimateSection>

      {/* Row 3: Account Balances */}
      <AnimateSection delay={0.20}>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-7">
          <GlassCard title="Account Balances" className="lg:col-span-4">
            <AccountBalances accounts={accounts} transactions={trendItems} />
          </GlassCard>

          <GlassCard title="Add Account" className="lg:col-span-3">
            <AccountForm />
          </GlassCard>
        </div>
      </AnimateSection>

      {/* Row 4: 6-Month Spending Trend & Activity */}
      <AnimateSection delay={0.28}>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-7">
          <GlassCard title="6-Month Spending Trend" className="lg:col-span-4">
            <div className="h-87.5 w-full">
              <MonthlyChart transactions={trendItems} />
            </div>
          </GlassCard>

          <GlassCard title="Recent Activity" className="lg:col-span-3">
            <div className="h-full">
              <RecentTransactions
                transactions={filteredTransactions.slice(0, 10)}
              />
              <div className="mt-4 flex justify-end">
                <Link
                  href="/dashboard/transactions"
                  className="text-xs font-medium text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
                >
                  View All Transactions
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </GlassCard>
        </div>
      </AnimateSection>
    </div>
  );
}
