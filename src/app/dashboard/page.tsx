import Link from "next/link";
import { getCategoryBreakdown } from "@/app/lib/mockData"; // Using your updated path!
import { MonthlyChart } from "@/components/MonthlyChart";
import { SummaryCard } from "@/components/SummaryCard";
import { GlassCard } from "@/components/GlassCard";
import {
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
import { UploadCloud, Settings } from "lucide-react";

const mockSummary = {
  totalIncome: 5240.0,
  totalExpense: 3150.75,
  netBalance: 2089.25,
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-12">
      {/* LEFT COLUMN */}
      <div className="md:col-span-8 flex flex-col gap-6">
        {/* 1. TOP SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FadeIn delay={0.1}>
            <SummaryCard
              title="Total Income"
              description="Total Income"
              value={`$${mockSummary.totalIncome.toFixed(2)}`}
              type="income"
            />
          </FadeIn>

          <FadeIn delay={0.2}>
            <SummaryCard
              title="Total Expenses"
              description="Total Expenses"
              value={`$${mockSummary.totalExpense.toFixed(2)}`}
              type="expense"
            />
          </FadeIn>

          <FadeIn delay={0.3}>
            <SummaryCard
              title="Net Balance"
              description="Net Balance"
              value={`$${mockSummary.netBalance.toFixed(2)}`}
              type="balance"
            />
          </FadeIn>
        </div>

        {/* 2. CATEGORY BREAKDOWN (Bumped up!) */}
        <FadeIn delay={0.4}>
          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-foreground/10 mb-4">
              <div className="space-y-1">
                <CardTitle className="text-foreground">
                  Category Breakdown
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Where your money is actually going this month.
                </CardDescription>
              </div>
              <Link href="/dashboard/settings/categories">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-foreground/10 bg-background/20 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                >
                  <Settings className="w-4 h-4 mr-2" /> Manage
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="border-foreground/10">
                  <TableRow className="hover:bg-transparent border-foreground/10 text-muted-foreground">
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCategoryBreakdown().map((item) => (
                    <TableRow
                      key={item.id}
                      className="relative border-foreground/5 hover:bg-primary/10 transition-colors group"
                    >
                      <TableCell className="font-medium text-foreground group-hover:text-primary">
                        <Link
                          href={`/dashboard/category/${item.id}`}
                          className="absolute inset-0"
                        />
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            item.type === "income"
                              ? "bg-primary/20 text-primary border-none hover:bg-primary/30"
                              : "bg-orange-500/20 text-orange-600 border-none hover:bg-orange-500/30"
                          }
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        ${item.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </GlassCard>
        </FadeIn>

        {/* 3. MONTHLY CHART (Moved to the bottom) */}
        <FadeIn delay={0.5}>
          <MonthlyChart />
        </FadeIn>
      </div>

      {/* RIGHT COLUMN */}
      <div className="md:col-span-4">
        <FadeIn delay={0.6}>
          <GlassCard className="border-t-primary/50 border-t-2 sticky top-24">
            <CardHeader>
              <CardTitle className="text-foreground">
                Upload Statement
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Drag and drop your CSV or PDF here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={uploadBankStatement}
                className="flex flex-col gap-4"
              >
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer bg-background/20 hover:bg-background/40 hover:border-primary/50 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CSV or PDF (MAX. 10MB)
                    </p>
                  </div>
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
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
                >
                  Upload & Parse
                </Button>
              </form>
            </CardContent>
          </GlassCard>
        </FadeIn>
      </div>
    </div>
  );
}
