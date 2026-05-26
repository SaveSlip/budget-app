"use client";

import { useState } from "react";
import { createTransaction } from "@/app/actions/transactions";
import { createRecurringTransaction } from "@/app/actions/recurring";
import { Loader2 } from "lucide-react";
import type { Account, Category } from "@/lib/data/budget";

interface TransactionFormProps {
  categories: Category[];
  accounts: Account[];
  initialType?: "INCOME" | "EXPENSE";
  hideTypeToggle?: boolean;
  onSuccess?: () => void;
}

export default function TransactionForm({
  categories = [],
  accounts = [],
  initialType = "EXPENSE",
  hideTypeToggle = false,
  onSuccess,
}: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [monthOfYear, setMonthOfYear] = useState("1");
  const [dayOfYear, setDayOfYear] = useState("1");

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
      const result = isRecurring
        ? await createRecurringTransaction({
            description: formData.description,
            amount: Number(formData.amount),
            category: formData.category,
            transactionType: formData.transactionType,
            accountId: formData.accountId || undefined,
            frequency,
            dayOfMonth: frequency === "MONTHLY" && dayOfMonth ? parseInt(dayOfMonth, 10) : undefined,
            dayOfWeek: frequency === "WEEKLY" ? parseInt(dayOfWeek, 10) : undefined,
            monthOfYear: frequency === "YEARLY" ? parseInt(monthOfYear, 10) : undefined,
            dayOfYear: frequency === "YEARLY" ? parseInt(dayOfYear, 10) : undefined,
            isActive: true,
          })
        : await createTransaction({
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
        setIsRecurring(false);
        setFrequency("MONTHLY");
        setDayOfMonth("");
        setDayOfWeek("1");
        setMonthOfYear("1");
        setDayOfYear("1");
        onSuccess?.();
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

      <div className={`grid gap-4 ${isRecurring ? "grid-cols-1" : "grid-cols-2"}`}>
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

        {!isRecurring && (
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
        )}
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

      <div className="flex items-center gap-2 pt-1">
        <input
          id="recurring-toggle"
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
        />
        <label htmlFor="recurring-toggle" className="text-sm font-medium text-muted-foreground cursor-pointer">
          Make this a recurring transaction
        </label>
      </div>

      {isRecurring && (
        <div className="space-y-3 pl-6 border-l-2 border-primary/20">
          <div>
            <label className="text-sm font-medium leading-none text-muted-foreground">
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          {frequency === "WEEKLY" && (
            <div>
              <label className="text-sm font-medium leading-none text-muted-foreground">
                Day of Week
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
          )}

          {frequency === "MONTHLY" && (
            <div>
              <label className="text-sm font-medium leading-none text-muted-foreground">
                Day of Month <span className="text-muted-foreground/60">(optional, 1–31)</span>
              </label>
              <input
                type="number"
                min={1}
                max={31}
                placeholder="e.g., 15"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </div>
          )}

          {frequency === "YEARLY" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium leading-none text-muted-foreground">
                  Month
                </label>
                <select
                  value={monthOfYear}
                  onChange={(e) => setMonthOfYear(e.target.value)}
                  className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium leading-none text-muted-foreground">
                  Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="e.g., 1"
                  value={dayOfYear}
                  onChange={(e) => setDayOfYear(e.target.value)}
                  className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-success">
          {isRecurring ? "Recurring transaction added." : "Transaction recorded successfully."}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full mt-2"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : isRecurring ? (
          "Add Recurring Transaction"
        ) : (
          "Record Transaction"
        )}
      </button>
    </form>
  );
}
