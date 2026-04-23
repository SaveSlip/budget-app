// app/dashboard/category/[categoryId]/page.tsx
"use client"; // Needs to be a client component so we can use useRouter for the dropdown

import { useParams, useRouter } from "next/navigation";
import {
  Card,
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
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-white">
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
              className="text-slate-400 hover:text-white hover:bg-white/10"
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
              <SelectTrigger className="bg-black/40 border-white/10 text-white">
                <SelectValue placeholder="Switch Category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                {categories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className="hover:bg-emerald-500/20 focus:bg-emerald-500/20 cursor-pointer"
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
        <Card className="border-white/5 bg-white/5 backdrop-blur-sm border-t-emerald-500/50 border-t-2">
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              {category.name} Transactions
            </CardTitle>
            <CardDescription className="text-slate-400">
              All parsed entries for this month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">
                No transactions found for this category.
              </p>
            ) : (
              <Table>
                <TableHeader className="border-white/10">
                  <TableRow className="hover:bg-transparent border-white/10 text-slate-300">
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow
                      key={t.id}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell className="text-slate-400">{t.date}</TableCell>
                      <TableCell className="font-medium text-slate-200">
                        {t.description}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${category.type === "income" ? "text-emerald-400" : "text-rose-400"}`}
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
        </Card>
      </FadeIn>
    </div>
  );
}
