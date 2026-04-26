// src/components/MonthlyChart.tsx
"use client";

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const mockChartData = [
  { month: "Nov", income: 4200, expense: 3800 },
  { month: "Dec", income: 4800, expense: 4100 },
  { month: "Jan", income: 5100, expense: 3200 },
  { month: "Feb", income: 4900, expense: 2900 },
  { month: "Mar", income: 5300, expense: 3400 },
  { month: "Apr", income: 5240, expense: 3150 },
];

export function MonthlyChart() {
  return (
    <Card className="border-border bg-foreground/5 backdrop-blur-sm shadow-sm">
      <CardHeader>
        <CardTitle className="text-foreground">6-Month Trend</CardTitle>
        <CardDescription className="text-muted-foreground">
          Historical analysis of income versus expenses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-75 w-full mt-4">
          <ResponsiveContainer width="100%" height={300} aspect={2.3}>
            <BarChart
              data={mockChartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.2 }}
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-foreground)",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
              <Bar
                dataKey="income"
                name="Income"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="Expense"
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
