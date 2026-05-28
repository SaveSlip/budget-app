"use client";

import { useState } from "react";
import { createTransaction } from "@/app/actions/transactions";
import { createRecurringTransaction } from "@/app/actions/recurring";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account, Category } from "@/lib/data/budget";

const NO_ACCOUNT = "__none__";

interface TransactionFormProps {
  categories: Category[];
  accounts: Account[];
  initialType?: "INCOME" | "EXPENSE";
  hideTypeToggle?: boolean;
  onSuccess?: () => void;
  initialRecurring?: boolean;
}

export default function TransactionForm({
  categories = [],
  accounts = [],
  initialType = "EXPENSE",
  hideTypeToggle = false,
  onSuccess,
  initialRecurring,
}: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecurring, setIsRecurring] = useState(initialRecurring ?? false);
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
    accountId: NO_ACCOUNT,
  });

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.category) {
      setError("Please select a category.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const accountId = formData.accountId === NO_ACCOUNT ? undefined : formData.accountId;
      const result = isRecurring
        ? await createRecurringTransaction({
            description: formData.description,
            amount: Number(formData.amount),
            category: formData.category,
            transactionType: formData.transactionType,
            accountId,
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
            accountId,
          });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setFormData({ description: "", amount: "", date: today, category: "", transactionType: initialType, accountId: NO_ACCOUNT });
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

  const visibleCategories = categories.filter(
    (c) => !c.categoryType || c.categoryType === formData.transactionType,
  );

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
        <Input
          type="text"
          required
          placeholder="e.g., AWS Route53 Renewal"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1.5"
        />
      </div>

      <div className={`grid gap-4 ${isRecurring ? "grid-cols-1" : "grid-cols-2"}`}>
        <div>
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Amount
          </label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="pl-7 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          </div>
        </div>

        {!isRecurring && (
          <div>
            <label className="text-sm font-medium leading-none text-muted-foreground">
              Date
            </label>
            <Input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="mt-1.5 scheme-light dark:scheme-dark"
            />
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium leading-none text-muted-foreground">
          Category
        </label>
        <Select
          value={formData.category}
          onValueChange={(v) => setFormData({ ...formData, category: v })}
        >
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue placeholder="Select a category..." />
          </SelectTrigger>
          <SelectContent>
            {visibleCategories.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                No categories yet — add one above
              </p>
            ) : (
              visibleCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium leading-none text-muted-foreground">
          Account <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <Select
          value={formData.accountId}
          onValueChange={(v) => setFormData({ ...formData, accountId: v })}
        >
          <SelectTrigger className="w-full mt-1.5">
            <SelectValue placeholder="No account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_ACCOUNT}>No account</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Schedule</p>

          <div>
            <label className="text-sm font-medium leading-none text-muted-foreground">
              Frequency
            </label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as typeof frequency)}
            >
              <SelectTrigger className="w-full mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency === "WEEKLY" && (
            <div>
              <label className="text-sm font-medium leading-none text-muted-foreground">
                Day of Week
              </label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger className="w-full mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {frequency === "MONTHLY" && (
            <div>
              <label className="text-sm font-medium leading-none text-muted-foreground">
                Day of Month <span className="text-muted-foreground/60">(optional, 1–31)</span>
              </label>
              <Input
                type="number"
                min={1}
                max={31}
                placeholder="e.g., 15"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="mt-1.5 [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </div>
          )}

          {frequency === "YEARLY" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium leading-none text-muted-foreground">
                  Month
                </label>
                <Select value={monthOfYear} onValueChange={setMonthOfYear}>
                  <SelectTrigger className="w-full mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium leading-none text-muted-foreground">
                  Day
                </label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="e.g., 1"
                  value={dayOfYear}
                  onChange={(e) => setDayOfYear(e.target.value)}
                  className="mt-1.5 [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
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

      <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : isRecurring ? (
          "Add Recurring Transaction"
        ) : (
          "Record Transaction"
        )}
      </Button>
    </form>
  );
}
