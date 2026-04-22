// app/dashboard/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { uploadBankStatement } from "./actions";

// --- THE ILLUSION OF DATA ---
// When we hook up DynamoDB, this will be replaced by a Server Action fetching real data.
const mockSummary = {
  totalIncome: 5240.0,
  totalExpense: 3150.75,
  netBalance: 2089.25,
};

const mockCategoryBreakdown = [
  { id: 1, category: "Housing", amount: 1500, type: "expense" },
  { id: 2, category: "Groceries", amount: 450, type: "expense" },
  { id: 3, category: "Coffee", amount: 1200, type: "expense" }, // Look, we all have vices.
  { id: 4, category: "Salary", amount: 5000, type: "income" },
  { id: 5, category: "Side Hustle", amount: 240, type: "income" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-12">
      {/* LEFT COLUMN: The Summary & Categories (Spans 8 columns) */}
      <div className="md:col-span-8 flex flex-col gap-6">
        {/* Top-Level Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Income</CardDescription>
              <CardTitle className="text-2xl text-emerald-600">
                ${mockSummary.totalIncome.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Expenses</CardDescription>
              <CardTitle className="text-2xl text-rose-600">
                ${mockSummary.totalExpense.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net Balance</CardDescription>
              <CardTitle className="text-2xl text-slate-800">
                ${mockSummary.netBalance.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Category Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>
              Where your money is actually going this month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCategoryBreakdown.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.category}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.type === "income" ? "default" : "destructive"
                        }
                      >
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ${item.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: The Upload Form (Spans 4 columns) */}
      <div className="md:col-span-4">
        <Card>
          <CardHeader>
            <CardTitle>Upload Statement</CardTitle>
            <CardDescription>
              Hand over your CSV or PDF. We promise our highly trained AI
              (currently just a console.log) will sort it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={uploadBankStatement} className="flex flex-col gap-4">
              <Input
                type="file"
                name="statement"
                accept=".csv, .pdf"
                required
                className="cursor-pointer"
              />
              <Button type="submit" className="w-full">
                Upload & Parse
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
