"use client";

import { useState, useTransition, useRef } from "react";
import { ArrowLeft, TrendingDown, TrendingUp, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { format, subMonths } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BudgetProgress } from "@/components/BudgetProgress";
import { RecentTransactions } from "@/components/RecentTransactions";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { GlassCard } from "@/components/GlassCard";
import type { Category, Transaction } from "@/lib/data/budget";
import { ScrollFade } from "@/components/ScrollFade";

interface Props {
  categories: Category[];
  spendingMap: Record<string, number>;
  adjustedCategoryLimits: Record<string, number>;
  rolloverDeltas: Record<string, number>;
  prevSpendingMap: Record<string, number>;
  sparklineData: Record<string, [number, number, number]>;
  sparkMonths: [string, string, string];
  transactions: Transaction[];
  availableMonths: string[];
  activeMonth: string;
  activeYear: string;
  view: string;
  initialCategory?: string;
}

const CHART_COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b",
  "#ec4899", "#14b8a6", "#6366f1", "#ef4444", "#84cc16",
  "#06b6d4", "#d946ef",
];

function formatMonthLabel(yyyyMm: string): string {
  try {
    return format(new Date(yyyyMm + "-02"), "MMM");
  } catch {
    return yyyyMm;
  }
}

function computeHealthScore(
  categories: Category[],
  spendingMap: Record<string, number>,
  adjustedLimits: Record<string, number>
): number {
  const withLimit = categories.filter((c) => (adjustedLimits[c.name] ?? c.limit ?? 0) > 0);
  if (withLimit.length === 0) return 100;
  const onTrack = withLimit.filter((c) => {
    const limit = adjustedLimits[c.name] ?? c.limit ?? 0;
    return (spendingMap[c.name] ?? 0) <= limit;
  });
  return Math.round((onTrack.length / withLimit.length) * 100);
}

interface DonutTooltipPayload {
  name: string;
  value: number;
  payload: { percent: number };
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: DonutTooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: inner } = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{name}</p>
      <p className="text-muted-foreground">
        ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} &mdash; {Math.round(inner.percent * 100)}%
      </p>
    </div>
  );
}

export function BenchmarkingPage({
  categories,
  spendingMap,
  adjustedCategoryLimits,
  rolloverDeltas,
  prevSpendingMap,
  sparklineData,
  sparkMonths,
  transactions,
  availableMonths,
  activeMonth,
  activeYear,
  view,
  initialCategory,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    () => categories.find((c) => c.name === initialCategory) ?? null
  );

  const totalBudgeted = categories.reduce(
    (sum, c) => sum + (adjustedCategoryLimits[c.name] ?? c.limit ?? 0),
    0
  );
  const totalSpent = categories.reduce(
    (sum, c) => sum + (spendingMap[c.name] ?? 0),
    0
  );
  const healthScore = computeHealthScore(categories, spendingMap, adjustedCategoryLimits);

  const donutData = categories
    .filter((c) => (spendingMap[c.name] ?? 0) > 0)
    .map((c) => ({ name: c.name, value: spendingMap[c.name] ?? 0 }));

  // ── Individual category view ──────────────────────────────────────────────
  if (selectedCategory !== null) {
    const cat = selectedCategory;
    const currentSpend = spendingMap[cat.name] ?? 0;
    const prevSpend = prevSpendingMap[cat.name] ?? 0;
    const momDelta = currentSpend - prevSpend;
    const hasMom = prevSpend > 0 || currentSpend > 0;

    const sparkRaw = sparklineData[cat.name] ?? [0, 0, 0];
    const sparkData = sparkMonths.map((m, i) => ({
      month: formatMonthLabel(m),
      spent: sparkRaw[i],
    }));

    const catTxs = transactions.filter((tx) => tx.category === cat.name);

    return (
      <div className="flex-1 w-full space-y-6">
        {/* Header row */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Categories
          </button>
          <span className="text-muted-foreground/40">|</span>
          <h2 className="text-2xl font-bold text-foreground">{cat.name}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* BudgetProgress card at full width in its cell */}
          <GlassCard className="lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Budget Progress
            </p>
            <BudgetProgress
              categoryName={cat.name}
              limit={cat.limit || 0}
              adjustedLimit={adjustedCategoryLimits[cat.name] ?? cat.limit ?? 0}
              rolloverDelta={rolloverDeltas[cat.name] ?? 0}
              spent={currentSpend}
              isUniversal={cat.isUniversal}
              categoryId={cat.id}
            />
          </GlassCard>

          {/* Month-over-month comparison */}
          <GlassCard className="lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Month-over-Month
            </p>
            {!hasMom ? (
              <p className="text-sm text-muted-foreground">No transactions recorded for this period yet.</p>
            ) : (
              <>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">This month</p>
                    <p className="text-xl font-mono font-bold text-foreground">
                      ${currentSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Last month</p>
                    <p className="text-xl font-mono font-bold text-foreground">
                      ${prevSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "mt-3 flex items-center gap-1.5 text-sm font-semibold",
                    momDelta > 0 ? "text-destructive" : momDelta < 0 ? "text-success" : "text-muted-foreground"
                  )}
                >
                  {momDelta > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : momDelta < 0 ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  {momDelta === 0
                    ? "No change"
                    : `${momDelta > 0 ? "+" : ""}$${Math.abs(momDelta).toLocaleString(undefined, { maximumFractionDigits: 2 })} vs last month`}
                </div>
              </>
            )}
          </GlassCard>

          {/* 3-month sparkline */}
          <GlassCard className="lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              3-Month Trend
            </p>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={sparkData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <RechartsTooltip
                  formatter={(value) => [`$${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, "Spent"]}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: 12 }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Line
                  type="monotone"
                  dataKey="spent"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#f97316" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        {/* Transactions for this category */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Transactions — {cat.name}
            </h3>
            <Link
              href={`/dashboard/transactions?month=${activeMonth}&view=${view}&year=${activeYear}&q=${encodeURIComponent(cat.name)}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all in Transactions →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <RecentTransactions
              transactions={catTxs.slice(0, 10)}
              categories={[cat]}
              emptyMessage={`No transactions in ${cat.name} this period.`}
            />
          </div>
        </GlassCard>
      </div>
    );
  }

  // ── All Categories overview ───────────────────────────────────────────────
  const healthColor =
    healthScore >= 80 ? "text-success" : healthScore >= 50 ? "text-warning" : "text-destructive";
  const healthBg =
    healthScore >= 80 ? "bg-success/10" : healthScore >= 50 ? "bg-warning/10" : "bg-destructive/10";

  return (
    <BenchmarkingOverview
      categories={categories}
      spendingMap={spendingMap}
      adjustedCategoryLimits={adjustedCategoryLimits}
      rolloverDeltas={rolloverDeltas}
      donutData={donutData}
      totalBudgeted={totalBudgeted}
      totalSpent={totalSpent}
      healthScore={healthScore}
      healthColor={healthColor}
      healthBg={healthBg}
      availableMonths={availableMonths}
      activeMonth={activeMonth}
      activeYear={activeYear}
      view={view}
      onSelectCategory={setSelectedCategory}
    />
  );
}

// ── Extracted overview to keep the period-filter router hooks at this level ──
function BenchmarkingOverview({
  categories,
  spendingMap,
  adjustedCategoryLimits,
  rolloverDeltas,
  donutData,
  totalBudgeted,
  totalSpent,
  healthScore,
  healthColor,
  healthBg,
  availableMonths,
  activeMonth,
  activeYear,
  view,
  onSelectCategory,
}: {
  categories: Category[];
  spendingMap: Record<string, number>;
  adjustedCategoryLimits: Record<string, number>;
  rolloverDeltas: Record<string, number>;
  donutData: { name: string; value: number }[];
  totalBudgeted: number;
  totalSpent: number;
  healthScore: number;
  healthColor: string;
  healthBg: string;
  availableMonths: string[];
  activeMonth: string;
  activeYear: string;
  view: string;
  onSelectCategory: (cat: Category) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const currentYear = format(new Date(), "yyyy");
  const years = [0, 1, 2, 3].map((i) => String(Number(currentYear) - i));

  const months = (
    availableMonths.length > 0
      ? availableMonths
      : Array.from({ length: 12 }, (_, i) => format(subMonths(new Date(), i), "yyyy-MM"))
  ).map((value) => ({ label: format(new Date(value + "-02"), "MMMM yyyy"), value }));
  const latestMonth = months[0]?.value ?? format(new Date(), "yyyy-MM");

  function updateFilters(updates: Record<string, string>) {
    const params = new URLSearchParams();
    const next = { month: activeMonth, year: activeYear, view, ...updates };
    if (next.month) params.set("month", next.month);
    if (next.year) params.set("year", next.year);
    if (next.view) params.set("view", next.view);
    startTransition(() => router.push(`/dashboard/benchmarking?${params.toString()}`));
  }

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleViewMouseEnter = (newView: string, updates: Record<string, string>) => {
    if (view === newView) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    hoverTimer.current = setTimeout(() => updateFilters(updates), 150);
  };

  const handleViewMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  return (
    <div className="flex-1 w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget Benchmarking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Click any category to explore its details
          </p>
        </div>
        <AddCategoryDialog variant="prominent" />
      </div>

      {/* Period filter — month/year select + Monthly/Yearly toggle, no search */}
      <div className="flex flex-wrap items-center gap-4 bg-muted/50 p-4 rounded-xl border border-border backdrop-blur-md">
        <div className="shrink-0">
          {view === "monthly" ? (
            <Select value={activeMonth} onValueChange={(val) => updateFilters({ month: val, view: "monthly" })}>
              <SelectTrigger className="w-52 bg-background/70 border-2 border-border text-foreground font-semibold">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-popover border-border text-popover-foreground">
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
                <SelectItem value="all">All months</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select value={activeYear} onValueChange={(val) => updateFilters({ year: val, view: "yearly" })}>
              <SelectTrigger className="w-52 bg-background/70 border-2 border-border text-foreground font-semibold">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-popover border-border text-popover-foreground">
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
                <SelectItem value="all">All years</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-sm font-semibold tracking-wide uppercase">
          <button
            onClick={() => view !== "monthly" && updateFilters({ view: "monthly", year: "", month: latestMonth })}
            onMouseEnter={() => handleViewMouseEnter("monthly", { view: "monthly", year: "", month: latestMonth })}
            onMouseLeave={handleViewMouseLeave}
            className={cn("transition-colors focus-visible:outline-none", view === "monthly" ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Monthly
          </button>
          <span className="text-muted-foreground">/</span>
          <button
            onClick={() => view !== "yearly" && updateFilters({ view: "yearly", month: "", year: activeYear })}
            onMouseEnter={() => handleViewMouseEnter("yearly", { view: "yearly", month: "", year: activeYear })}
            onMouseLeave={handleViewMouseLeave}
            className={cn("transition-colors focus-visible:outline-none", view === "yearly" ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Budgeted
          </p>
          <p className="mt-1 text-2xl font-mono font-bold text-foreground">
            ${totalBudgeted.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Spent
          </p>
          <p className={cn("mt-1 text-2xl font-mono font-bold", totalSpent > totalBudgeted ? "text-destructive" : "text-foreground")}>
            ${totalSpent.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Budget Health Score
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={cn("text-2xl font-mono font-bold", healthColor)}>{healthScore}</span>
            <span className="text-muted-foreground text-sm">/ 100</span>
            <span className={cn("ml-auto text-xs font-semibold px-2 py-0.5 rounded-full", healthBg, healthColor)}>
              {healthScore >= 80 ? "On Track" : healthScore >= 50 ? "Watch Out" : "Over Budget"}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Donut chart beside grid when spending exists; grid full-width otherwise */}
      {donutData.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <GlassCard>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Spending Distribution
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ScrollFade className="mt-2 max-h-36" fadeClassName="to-card/90">
              <div className="space-y-1.5">
                {donutData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground truncate flex-1">{entry.name}</span>
                    <span className="font-mono text-foreground">${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
            </ScrollFade>
          </GlassCard>
          <div className="grid gap-4 content-start grid-cols-2 md:grid-cols-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectCategory(cat)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectCategory(cat)}
                className="w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-lg hover:ring-2 hover:ring-primary/40 transition-all"
              >
                <BudgetProgress
                  categoryName={cat.name}
                  limit={cat.limit || 0}
                  adjustedLimit={adjustedCategoryLimits[cat.name] ?? cat.limit ?? 0}
                  rolloverDelta={rolloverDeltas[cat.name] ?? 0}
                  spent={spendingMap[cat.name] ?? 0}
                  isUniversal={cat.isUniversal}
                  categoryId={cat.id}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 content-start grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectCategory(cat)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectCategory(cat)}
              className="w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-lg hover:ring-2 hover:ring-primary/40 transition-all"
            >
              <BudgetProgress
                categoryName={cat.name}
                limit={cat.limit || 0}
                adjustedLimit={adjustedCategoryLimits[cat.name] ?? cat.limit ?? 0}
                rolloverDelta={rolloverDeltas[cat.name] ?? 0}
                spent={spendingMap[cat.name] ?? 0}
                isUniversal={cat.isUniversal}
                categoryId={cat.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
