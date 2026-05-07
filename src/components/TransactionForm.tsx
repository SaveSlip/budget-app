"use client";

import { useState } from "react";
import { createTransaction } from "@/app/actions/transactions";
import Link from "next/link";
import { Settings2, Loader2 } from "lucide-react";
import type { Category } from "@/lib/data/budget";

interface TransactionFormProps {
  categories: Category[];
}

export default function TransactionForm({
  categories = [],
}: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: today,
    category: "",
    transactionType: "EXPENSE" as "INCOME" | "EXPENSE",
  });

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await createTransaction({
        description: formData.description,
        amount: Number(formData.amount),
        date: formData.date,
        category: formData.category,
        transactionType: formData.transactionType,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setFormData({ description: "", amount: "", date: today, category: "", transactionType: "EXPENSE" });
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Income / Expense toggle */}
      <div className="flex rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, transactionType: "EXPENSE" })}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            formData.transactionType === "EXPENSE"
              ? "bg-red-500/15 text-red-500"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, transactionType: "INCOME" })}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            formData.transactionType === "INCOME"
              ? "bg-green-500/15 text-green-500"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Income
        </button>
      </div>

      <div>
        <label className="text-sm font-medium leading-none text-muted-foreground">
          Description
        </label>
        <input
          type="text"
          required
          placeholder="e.g., AWS Route53 Renewal"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Amount
          </label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
              $
            </span>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="flex h-10 w-full rounded-md border border-border bg-transparent pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Date
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary scheme-light dark:scheme-dark"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Category
          </label>
          <Link
            href="/dashboard/settings/categories"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            Manage Categories
          </Link>
        </div>
        <select
          required
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
        >
          <option value="" disabled>
            Select a category...
          </option>
          {categories.length === 0 ? (
            <option disabled>No categories yet — add one above</option>
          ) : (
            categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))
          )}
        </select>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && (
        <p className="text-sm text-green-500">
          Transaction recorded successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full mt-2"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          "Record Transaction"
        )}
      </button>
    </form>
  );
}
