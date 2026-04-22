// app/dashboard/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { FadeIn } from "@/components/FadeIn";
import { UploadCloud } from "lucide-react"; // Our shiny new icon

const mockSummary = {
  totalIncome: 5240.0,
  totalExpense: 3150.75,
  netBalance: 2089.25,
};

const mockCategoryBreakdown = [
  { id: 1, category: "Housing", amount: 1500, type: "expense" },
  { id: 2, category: "Groceries", amount: 450, type: "expense" },
  { id: 3, category: "Coffee", amount: 1200, type: "expense" },
  { id: 4, category: "Salary", amount: 5000, type: "income" },
  { id: 5, category: "Side Hustle", amount: 240, type: "income" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-12">
      {/* LEFT COLUMN */}
      <div className="md:col-span-8 flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FadeIn delay={0.1}>
            <Card className="h-full border-white/5 bg-white/5 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-emerald-500/30">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">
                  Total Income
                </CardDescription>
                <CardTitle className="text-3xl text-emerald-400 font-mono tracking-tight">
                  ${mockSummary.totalIncome.toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>
          </FadeIn>

          <FadeIn delay={0.2}>
            <Card className="h-full border-white/5 bg-white/5 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-rose-500/30">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">
                  Total Expenses
                </CardDescription>
                <CardTitle className="text-3xl text-rose-400 font-mono tracking-tight">
                  ${mockSummary.totalExpense.toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>
          </FadeIn>

          <FadeIn delay={0.3}>
            <Card className="h-full border-white/5 bg-white/5 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/30">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">
                  Net Balance
                </CardDescription>
                <CardTitle className="text-3xl text-white font-mono tracking-tight">
                  ${mockSummary.netBalance.toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>
          </FadeIn>
        </div>

        <FadeIn delay={0.4}>
          <Card className="border-white/5 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Category Breakdown</CardTitle>
              <CardDescription className="text-slate-400">
                Where your money is actually going this month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="border-white/10">
                  <TableRow className="hover:bg-transparent border-white/10 text-slate-300">
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCategoryBreakdown.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell className="font-medium text-slate-200">
                        {item.category}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            item.type === "income"
                              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none"
                              : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border-none"
                          }
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-300">
                        ${item.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* RIGHT COLUMN */}
      <div className="md:col-span-4">
        <FadeIn delay={0.5}>
          <Card className="border-white/5 bg-white/5 backdrop-blur-sm border-t-emerald-500/50 border-t-2">
            <CardHeader>
              <CardTitle className="text-white">Upload Statement</CardTitle>
              <CardDescription className="text-slate-400">
                Drag and drop your CSV or PDF here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={uploadBankStatement}
                className="flex flex-col gap-4"
              >
                {/* The Custom Dropzone UI */}
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer bg-black/20 hover:bg-black/40 hover:border-emerald-500/50 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 mb-3 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                    <p className="mb-2 text-sm text-slate-400">
                      <span className="font-semibold text-slate-200">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-slate-500">
                      CSV or PDF (MAX. 10MB)
                    </p>
                  </div>
                  {/* The actual input is hidden! */}
                  <input
                    type="file"
                    name="statement"
                    accept=".csv, .pdf"
                    required
                    className="hidden"
                  />
                </label>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  Upload & Parse
                </Button>
              </form>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
