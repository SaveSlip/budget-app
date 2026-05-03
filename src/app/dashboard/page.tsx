// src/app/dashboard/page.tsx
import { getMonthlyData, getCategories } from "@/lib/data/budget";
import { Suspense } from "react";
import { SummaryCard } from "@/components/SummaryCard";
import { MonthlyChart } from "@/components/MonthlyChart";
import TransactionForm from "@/components/TransactionForm";
import { RecentTransactions } from "@/components/RecentTransactions";
import { GlassCard } from "@/components/GlassCard";
import { FadeIn } from "@/components/FadeIn";
import { Skeleton } from "@/components/ui/skeleton";

export default async function DashboardPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Fetch live data from the Data Access Layer (DAL) concurrently for performance
  const [rawData, categories] = await Promise.all([
    getMonthlyData(currentMonth),
    getCategories(),
  ]);

  // Transform DynamoDB items for UI consumption
  const transactions = rawData.filter((item) => item.type === "TRANSACTION");
  const totalSpent = transactions.reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );
  const dailyAverage = transactions.length > 0 ? totalSpent / now.getDate() : 0;

  return (
    <FadeIn>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            Financial Intelligence
          </h1>
          <p className="text-muted-foreground italic">
            Institutional-grade oversight for {currentMonth}
          </p>
        </header>

        {/* High-Density Metric Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Total Monthly Spending"
            value={totalSpent}
            type="currency"
            description="Verified outflows"
          />
          <SummaryCard
            title="Daily Burn Rate"
            value={dailyAverage}
            type="currency"
            description="Average daily velocity"
          />
          <SummaryCard
            title="Total Operations"
            value={transactions.length}
            type="number"
            description="Transaction count"
          />
        </div>

        {/* Primary Dashboard Content Grid */}
        <div className="grid gap-6 md:grid-cols-12">
          {/* Data Visualizations (Left Column) */}
          <div className="md:col-span-8 space-y-6">
            <GlassCard className="p-6">
              <h3 className="mb-4 font-semibold">Spending Velocity</h3>
              <Suspense fallback={<Skeleton className="h-[350px] w-full" />}>
                <MonthlyChart data={transactions} />
              </Suspense>
            </GlassCard>

            <GlassCard className="p-6 overflow-hidden">
              <h3 className="mb-4 font-semibold">Recent Operations</h3>
              <RecentTransactions transactions={transactions} />
            </GlassCard>
          </div>

          {/* Action Center (Right Column) */}
          <div className="md:col-span-4">
            <TransactionForm categories={categories} />
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
