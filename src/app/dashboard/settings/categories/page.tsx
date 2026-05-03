// src/app/dashboard/settings/categories/page.tsx
import { getCategories } from "@/lib/data/budget";
import { CategoryForm } from "@/components/CategoryForm";
import { GlassCard } from "@/components/GlassCard";
import { FadeIn } from "@/components/FadeIn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default async function CategoriesPage() {
  // Fetch the user's defined categories from DynamoDB
  const categories = await getCategories();

  // Sort categories alphabetically by name for a cleaner UI
  const sortedCategories = categories.sort((a, b) =>
    (a.name || "").localeCompare(b.name || ""),
  );

  return (
    <FadeIn>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            Category Configuration
          </h1>
          <p className="text-muted-foreground italic">
            Manage your fixed and variable allocation parameters.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-12">
          {/* Defined Categories Table (Left Column) */}
          <div className="md:col-span-8">
            <GlassCard className="p-6 overflow-hidden">
              <h3 className="mb-4 font-semibold">Active Categories</h3>

              <div className="rounded-md border border-zinc-800 bg-zinc-950/50">
                <Table>
                  <TableHeader className="bg-zinc-900/50">
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-xs font-bold uppercase tracking-wider">
                        Name
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">
                        Type
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider">
                        Allocation
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCategories.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="h-24 text-center text-sm text-muted-foreground"
                        >
                          No categories defined. Please establish your base
                          allocations.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedCategories.map((cat) => (
                        <TableRow
                          key={cat.sk}
                          className="border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
                        >
                          <TableCell className="text-sm font-medium leading-none">
                            {cat.name}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                cat.expenseType === "fixed"
                                  ? "bg-zinc-800 text-zinc-300"
                                  : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50",
                              )}
                            >
                              {cat.expenseType}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold tracking-tighter text-zinc-100">
                            $
                            {(cat.monthlyAllocated || 0).toLocaleString(
                              undefined,
                              { minimumFractionDigits: 2 },
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </GlassCard>
          </div>

          {/* Action Center (Right Column) */}
          <div className="md:col-span-4">
            <CategoryForm />
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
