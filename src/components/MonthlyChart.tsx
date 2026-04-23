// src/components/MonthlyChart.tsx
"use client";

import dynamic from "next/dynamic";
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

// 1. Notice we removed "export" from here and renamed it to BaseChart
function BaseChart() {
  return (
    <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">6-Month Trend</CardTitle>
        <CardDescription className="text-slate-400">
          Income vs. Expenses over time. Look at that fake financial stability!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mockChartData}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                cursor={{ fill: "#1e293b", opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#f8fafc",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
              <Bar
                dataKey="income"
                name="Income"
                fill="#34d399"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="Expense"
                fill="#fb7185"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// 2. The Magic Trick: Dynamically export the component from WITHIN its own client file
export const MonthlyChart = dynamic(() => Promise.resolve(BaseChart), {
  ssr: false,
  loading: () => (
    <Card className="border-white/5 bg-white/5 backdrop-blur-sm h-[430px] flex items-center justify-center text-slate-500">
      Loading analytics...
    </Card>
  ),
});
