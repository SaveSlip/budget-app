"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import type { Transaction } from "@/lib/data/budget";

interface MonthlyChartProps {
  transactions: Transaction[];
  year?: string;
}

export function MonthlyChart({ transactions, year }: MonthlyChartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeMonth = searchParams.get("month") || format(new Date(), "yyyy-MM");

  const chartData = useMemo(() => {
    const months = year
      ? Array.from({ length: 12 }, (_, i) => {
          const date = new Date(Number(year), i, 1);
          return {
            label: format(date, "MMM"),
            monthValue: format(date, "yyyy-MM"),
            start: startOfMonth(date),
            end: endOfMonth(date),
            expense: 0,
            income: 0,
          };
        })
      : Array.from({ length: 12 })
          .map((_, i) => {
            const date = subMonths(new Date(), i);
            return {
              label: format(date, "MMM"),
              monthValue: format(date, "yyyy-MM"),
              start: startOfMonth(date),
              end: endOfMonth(date),
              expense: 0,
              income: 0,
            };
          })
          .reverse();

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date + "T00:00:00");
      const amount = Math.abs(Number(tx.amount) || 0);
      const isIncome = tx.transactionType === "INCOME";

      months.forEach((month) => {
        if (isWithinInterval(txDate, { start: month.start, end: month.end })) {
          if (isIncome) month.income += amount;
          else month.expense += amount;
        }
      });
    });

    return months;
  }, [transactions, year]);

  function handleBarClick(data: { monthValue: string }) {
    if (year || !data?.monthValue) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", data.monthValue);
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 200);
  }

  return (
    <div className="h-75 w-full [&_svg]:outline-none **:outline-none">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="label"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            formatter={(value) => {
              const num = typeof value === "number" ? value : Number(value);
              return [`$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, undefined];
            }}
            cursor={{ fill: "var(--muted)", stroke: "none" }}
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--popover-foreground)",
            }}
            itemStyle={{ color: "var(--popover-foreground)" }}
          />
          <Legend />
          <Bar
            dataKey="income"
            name="Income"
            fill="var(--chart-3)"
            radius={[4, 4, 0, 0]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(data: any) => handleBarClick(data)}
            style={{ cursor: year ? "default" : "pointer" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => <Rectangle {...props} fillOpacity={year ? 1 : props.monthValue === activeMonth ? 1 : 0.5} />}
          />
          <Bar
            dataKey="expense"
            name="Expense"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(data: any) => handleBarClick(data)}
            style={{ cursor: year ? "default" : "pointer" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => <Rectangle {...props} fillOpacity={year ? 1 : props.monthValue === activeMonth ? 1 : 0.5} />}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
