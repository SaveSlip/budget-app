// src/app/dashboard/page.tsx
import { getMonthlyData, getCategories } from "@/lib/data/budget";
import { Suspense } from "react";
import { SummaryCard } from "@/components/SummaryCard";
import { MonthlyChart } from "@/components/MonthlyChart";
import TransactionForm from "@/components/TransactionForm";
import { RecentTransactions, type Transaction } from "@/components/RecentTransactions";
import { GlassCard } from "@/components/GlassCard";
import { FadeIn } from "@/components/FadeIn";
import { Skeleton } from "@/components/ui/skeleton";
import CsvUploader from "@/components/CsvUploader";
import type { Category } from "@/components/TransactionForm";

export default async function DashboardPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [rawData, rawCategories] = await Promise.all([
    getMonthlyData(currentMonth),
    getCategories(),
  ]);

  const transactions = rawData.filter(
    (item): item is Transaction => item.type === "TRANSACTION",
  );
  const categories: Category[] = rawCategories.map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  const totalSpent = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const dailyAverage = transactions.length > 0 ? totalSpent / now.getDate() : 0;

  return (
    <FadeIn>
      <div className="space-y-8">
        <header className="mb-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Financial Intelligence
          </h1>
        </header>

        {/* High-Density Metric Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Total Monthly Spending"
            value={totalSpent.toString()}
            type="expense"
            description="Verified outflows"
          />
          <SummaryCard
            title="Daily Burn Rate"
            value={dailyAverage.toFixed(2)}
            type="expense"
            description="Average daily velocity"
          />
          <SummaryCard
            title="Total Operations"
            value={transactions.length.toString()}
            type="balance"
            description="Transaction count"
          />
        </div>

        {/* Primary Dashboard Content Grid */}
        <div className="grid gap-6 md:grid-cols-12">
          {/* Data Visualizations (Left Column) */}
          <div className="md:col-span-8 space-y-6">
            <GlassCard className="p-6">
              <h3 className="mb-4 font-semibold">Spending Velocity</h3>
              <Suspense fallback={<Skeleton className="h-75 w-full" />}>
                <MonthlyChart />
              </Suspense>
            </GlassCard>

            <GlassCard className="p-6 overflow-hidden">
              <h3 className="mb-4 font-semibold">Recent Operations</h3>
              <RecentTransactions transactions={transactions} />
            </GlassCard>
          </div>

          {/* Action Center (Right Column) */}
          <div className="md:col-span-4">
            <GlassCard className="p-6">
              <h3 className="mb-4 font-semibold">Log Operations</h3>

              <TransactionForm categories={categories} />

              <div className="my-6 flex items-center text-xs text-gray-400 uppercase before:flex-[1_1_0%] before:border-t before:border-gray-200 dark:before:border-gray-800 before:mr-4 after:flex-[1_1_0%] after:border-t after:border-gray-200 dark:after:border-gray-800 after:ml-4">
                Or Bulk Import
              </div>

              <CsvUploader />
            </GlassCard>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
