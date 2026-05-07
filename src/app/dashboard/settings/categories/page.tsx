import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCategories, type Category } from "@/lib/data/budget";
import { CategoryForm } from "@/components/CategoryForm";
import { GlassCard } from "@/components/GlassCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CategoryActions } from "@/components/CategoryActions";

export default async function CategoriesSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  // Fetch existing categories from DynamoDB
  const categories = await getCategories();

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto space-y-8 pt-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Category Configuration
        </h2>
        <p className="text-muted-foreground">
          Define your spending categories and set monthly budget benchmarks.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-5">
        {/* Left Column: The Form */}
        <div className="lg:col-span-2">
          <GlassCard title="Create New Category">
            <CategoryForm />
          </GlassCard>
        </div>

        {/* Right Column: Existing Categories List */}
        <div className="lg:col-span-3">
          <GlassCard title="Existing Categories">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground text-right">
                    Monthly Limit
                  </TableHead>
                  <TableHead className="text-foreground text-right">
                    Status
                  </TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category: Category) => (
                  <TableRow
                    key={category.id}
                    className="border-border hover:bg-accent transition-colors"
                  >
                    <TableCell className="font-medium text-foreground">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {category.limit > 0
                        ? `$${category.limit.toLocaleString()}`
                        : "No Limit"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={category.limit > 0 ? "default" : "secondary"}
                        className="bg-orange-500/20 text-orange-500 border-orange-500/20"
                      >
                        {category.limit > 0 ? "Benchmarked" : "Tracking Only"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <CategoryActions category={category} />
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground italic"
                    >
                      No categories found. Use the form to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
