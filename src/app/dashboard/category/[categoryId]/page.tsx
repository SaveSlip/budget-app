"use client"; // Needs to be a client component so we can use useRouter for the dropdown

import { useParams, useRouter } from "next/navigation";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { categories, getTransactionsByCategory } from "@/app/lib/mockData";
import { FadeIn } from "@/components/FadeIn";
import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();

  // Safely grab the category ID from the URL
  const currentCategoryId =
    typeof params.categoryId === "string" ? params.categoryId : "";

  // Find the category info and its transactions from our fake DB
  const category = categories.find((c) => c.id === currentCategoryId);
  const transactions = getTransactionsByCategory(currentCategoryId);

  // If someone types a random URL like /dashboard/category/unicorns
  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-foreground">
        <h2 className="text-2xl font-bold">Category not found</h2>
        <Link href="/dashboard">
          <Button variant="outline">Go Back Home</Button>
        </Link>
      </div>
    );
  }

  // Handle dropdown changes by pushing a new route
  const handleCategoryChange = (newCategoryId: string) => {
    router.push(`/dashboard/category/${newCategoryId}`);
  };

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6">
      {/* Top Header & Navigation row */}
      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>

          {/* The Dropdown Selector */}
          <div className="w-64">
            <Select
              value={currentCategoryId}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="bg-background/40 border-foreground/10 text-foreground">
                <SelectValue placeholder="Switch Category" />
              </SelectTrigger>
              <SelectContent className="bg-background border-foreground/10 text-foreground">
                {categories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className="hover:bg-primary/20 focus:bg-primary/20 cursor-pointer"
                  >
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FadeIn>

      {/* The Transactions Table Card */}
      <FadeIn delay={0.2}>
        <GlassCard className="border-t-primary/50 border-t-2">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">
              {category.name} Transactions
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              All parsed entries for this month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                No transactions found for this category.
              </p>
            ) : (
              <Table>
                <TableHeader className="border-foreground/10">
                  <TableRow className="hover:bg-transparent border-foreground/10 text-muted-foreground">
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow
                      key={t.id}
                      className="border-foreground/5 hover:bg-foreground/5"
                    >
                      <TableCell className="text-muted-foreground">
                        {t.date}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {t.description}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${category.type === "income" ? "text-primary" : "text-destructive"}`}
                      >
                        {category.type === "income" ? "+" : "-"}$
                        {t.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </GlassCard>
      </FadeIn>
    </div>
  );
}
