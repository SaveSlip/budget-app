"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import type { Transaction } from "@/lib/data/budget";

interface CashFlowChartProps {
  transactions: Transaction[];
  monthsBack?: number;
}

export function CashFlowChart({ transactions, monthsBack = 6 }: CashFlowChartProps) {
  const chartData = useMemo(() => {
    const months = Array.from({ length: monthsBack })
      .map((_, i) => {
        const date = subMonths(new Date(), i);
        return {
          label: format(date, "MMM yyyy"),
          start: startOfMonth(date),
          end: endOfMonth(date),
          income: 0,
          expenses: 0,
          net: 0,
        };
      })
      .reverse();

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const amount = Math.abs(Number(tx.amount) || 0);
      const isIncome = tx.transactionType === "INCOME";

      months.forEach((month) => {
        if (isWithinInterval(txDate, { start: month.start, end: month.end })) {
          if (isIncome) month.income += amount;
          else month.expenses += amount;
        }
      });
    });

    return months.map((m) => ({ ...m, net: m.income - m.expenses }));
  }, [transactions, monthsBack]);

  const formatCurrency = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
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
          tickFormatter={formatCurrency}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          contentStyle={{
            backgroundColor: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--popover-foreground)",
          }}
          itemStyle={{ color: "var(--popover-foreground)" }}
          formatter={(value: number) =>
            new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
          }
        />
        <Legend />
        <ReferenceLine y={0} stroke="var(--border)" />
        <Area
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="var(--chart-3)"
          strokeWidth={2}
          fill="url(#incomeGrad)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#expenseGrad)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="net"
          name="Net Cash Flow"
          stroke="var(--chart-2)"
          strokeWidth={2}
          strokeDasharray="5 3"
          fill="none"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
