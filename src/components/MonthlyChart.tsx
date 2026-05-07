"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
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
}

export function MonthlyChart({ transactions }: MonthlyChartProps) {
  // Process raw transactions into a 6-month trend format
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 })
      .map((_, i) => {
        const date = subMonths(new Date(), i);
        return {
          label: format(date, "MMM"),
          start: startOfMonth(date),
          end: endOfMonth(date),
          expense: 0,
          income: 0,
        };
      })
      .reverse();

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const amount = Number(tx.amount) || 0;

      months.forEach((month) => {
        if (isWithinInterval(txDate, { start: month.start, end: month.end })) {
          // Assuming negative/positive logic or a 'type' field
          if (amount < 0) month.expense += Math.abs(amount);
          else month.income += amount;
        }
      });
    });

    return months;
  }, [transactions]);

  return (
    <div className="h-75 w-full">
      <ResponsiveContainer width="100%" height={300} aspect={2.3}>
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
            cursor={{ fill: "var(--muted)" }}
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
          />
          <Bar
            dataKey="expense"
            name="Expense"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
