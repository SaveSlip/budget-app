"use client";

import { useState } from "react";
import { createTransaction } from "@/app/actions/transactions";
import { Loader2 } from "lucide-react";
import type { Account, Category } from "@/lib/data/budget";

interface TransactionFormProps {
  categories: Category[];
  accounts: Account[];
  initialType?: "INCOME" | "EXPENSE";
  hideTypeToggle?: boolean;
}

export default function TransactionForm({
  categories = [],
  accounts = [],
  initialType = "EXPENSE",
  hideTypeToggle = false,
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
    transactionType: initialType as "INCOME" | "EXPENSE",
    accountId: "",
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
        accountId: formData.accountId || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setFormData({ description: "", amount: "", date: today, category: "", transactionType: initialType, accountId: "" });
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
      {!hideTypeToggle && (
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, transactionType: "EXPENSE", category: "" })}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              formData.transactionType === "EXPENSE"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, transactionType: "INCOME", category: "" })}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              formData.transactionType === "INCOME"
                ? "bg-success/15 text-success"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Income
          </button>
        </div>
      )}

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
        <label className="text-sm font-medium leading-none text-muted-foreground">
          Category
        </label>
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
          {(() => {
            const visibleCategories = categories.filter(
              (c) => !c.categoryType || c.categoryType === formData.transactionType
            );
            return visibleCategories.length === 0 ? (
              <option disabled>No categories yet — add one above</option>
            ) : (
              visibleCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))
            );
          })()}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium leading-none text-muted-foreground">
          Account <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <select
          value={formData.accountId}
          onChange={(e) =>
            setFormData({ ...formData, accountId: e.target.value })
          }
          className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
        >
          <option value="">No account</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-success">
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
