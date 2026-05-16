"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  createRecurringTransaction,
  updateRecurringTransaction,
} from "@/app/actions/recurring";
import { createCategory } from "@/app/actions/categories";
import type { Account, Category, RecurringTransaction } from "@/lib/data/budget";

const FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
] as const;

interface RecurringTransactionFormProps {
  categories: Category[];
  accounts: Account[];
  existing?: RecurringTransaction;
  onSuccess?: () => void;
}

export function RecurringTransactionForm({
  categories,
  accounts,
  existing,
  onSuccess,
}: RecurringTransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [localIncomeCategories, setLocalIncomeCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: existing?.description ?? "",
    amount: existing?.amount?.toString() ?? "",
    category: existing?.category ?? "",
    transactionType: (existing?.transactionType ?? "EXPENSE") as "INCOME" | "EXPENSE",
    accountId: existing?.accountId ?? "",
    frequency: (existing?.frequency ?? "MONTHLY") as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
    dayOfMonth: existing?.dayOfMonth?.toString() ?? "",
    isActive: existing?.isActive ?? true,
  });

  const handleAddIncomeCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    setCatError(null);
    const result = await createCategory({ name: newCatName.trim(), limit: 0, categoryType: "INCOME" });
    setAddingCat(false);
    if (result.error === "universal") {
      setCatError(`"${newCatName.trim()}" is already a built-in income category.`);
    } else if (result.error === "duplicate") {
      setCatError("A category with this name already exists.");
    } else if (result.error) {
      setCatError(result.error);
    } else {
      const newCat: Category = {
        id: result.id!,
        name: newCatName.trim(),
        limit: 0,
        type: "CATEGORY",
        createdAt: new Date().toISOString(),
        isUniversal: false,
        categoryType: "INCOME",
      };
      setLocalIncomeCategories((prev) => [...prev, newCat]);
      setFormData((prev) => ({ ...prev, category: newCatName.trim() }));
      setNewCatName("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const payload = {
      description: formData.description,
      amount: Number(formData.amount),
      category: formData.category,
      transactionType: formData.transactionType,
      accountId: formData.accountId || undefined,
      frequency: formData.frequency,
      dayOfMonth: formData.frequency === "MONTHLY" && formData.dayOfMonth
        ? parseInt(formData.dayOfMonth, 10)
        : undefined,
      isActive: formData.isActive,
    };

    const result = existing
      ? await updateRecurringTransaction(existing.id, payload)
      : await createRecurringTransaction(payload);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      if (!existing) {
        setFormData({
          description: "",
          amount: "",
          category: "",
          transactionType: "EXPENSE",
          accountId: "",
          frequency: "MONTHLY",
          dayOfMonth: "",
          isActive: true,
        });
      }
      setTimeout(() => setSuccess(false), 3000);
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Income / Expense toggle */}
      <div className="flex rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => { setFormData({ ...formData, transactionType: "EXPENSE", category: "" }); setCatError(null); }}
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
          onClick={() => { setFormData({ ...formData, transactionType: "INCOME", category: "" }); setCatError(null); }}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            formData.transactionType === "INCOME"
              ? "bg-success/15 text-success"
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
          placeholder="e.g., Netflix, Rent, Gym"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Amount
          </label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="flex h-10 w-full rounded-md border border-border bg-transparent pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Frequency
          </label>
          <select
            value={formData.frequency}
            onChange={(e) =>
              setFormData({
                ...formData,
                frequency: e.target.value as typeof formData.frequency,
              })
            }
            className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {formData.frequency === "MONTHLY" && (
        <div>
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Day of Month <span className="text-muted-foreground/60">(optional, 1–28)</span>
          </label>
          <input
            type="number"
            min={1}
            max={28}
            placeholder="e.g., 1 for the 1st of each month"
            value={formData.dayOfMonth}
            onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
            className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
          />
        </div>
      )}

      <div>
        <label className="text-sm font-medium leading-none text-muted-foreground">
          Category
        </label>
        {(() => {
          const visibleCategories = [
            ...categories.filter((c) => c.categoryType === formData.transactionType),
            ...(formData.transactionType === "INCOME" ? localIncomeCategories : []),
          ];
          return (
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="" disabled>Select a category...</option>
              {visibleCategories.length === 0 ? (
                <option disabled>No categories yet</option>
              ) : (
                visibleCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))
              )}
            </select>
          );
        })()}
        {formData.transactionType === "INCOME" && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New income category name..."
                value={newCatName}
                onChange={(e) => { setNewCatName(e.target.value); setCatError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddIncomeCategory(); } }}
                className="flex h-9 flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleAddIncomeCategory}
                disabled={addingCat || !newCatName.trim()}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors disabled:opacity-50"
              >
                {addingCat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add
              </button>
            </div>
            {catError && <p className="text-xs text-destructive">{catError}</p>}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium leading-none text-muted-foreground">
          Account <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <select
          value={formData.accountId}
          onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
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
          {existing ? "Updated successfully." : "Recurring transaction added."}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full mt-2"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : existing ? (
          "Save Changes"
        ) : (
          "Add Recurring Transaction"
        )}
      </button>
    </form>
  );
}
