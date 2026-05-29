"use client";

import { useState } from "react";
import { MoreHorizontal, Edit, Trash, Loader2, Tag, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  updateTransaction,
  deleteTransaction,
  recategorizeByDescription,
} from "@/app/actions/transactions";
import { createRecurringTransaction } from "@/app/actions/recurring";
import { saveCategoryRule } from "@/app/actions/categoryRules";
import type { Account, Category } from "@/lib/data/budget";
import type { Transaction } from "@/app/dashboard/transactions/columns";

interface TransactionActionsProps {
  transaction: Transaction;
  initialCategories: Category[];
  initialAccounts: Account[];
  onCategoryUpdate?: (txId: string, category: string) => void;
  onDelete?: (txId: string) => void;
}

export function TransactionActions({ transaction, initialCategories, initialAccounts, onCategoryUpdate, onDelete }: TransactionActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCategorizeOpen, setIsCategorizeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categorizeData, setCategorizeData] = useState({
    category: transaction.category,
    saveRule: true,
    updateExisting: true,
  });

  const [formData, setFormData] = useState({
    description: transaction.description,
    amount: transaction.amount.toString(),
    date: transaction.date,
    category: transaction.category,
    transactionType: (transaction.transactionType ?? "EXPENSE") as "INCOME" | "EXPENSE",
    accountId: transaction.accountId ?? "",
  });

  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isRecurringSubmitting, setIsRecurringSubmitting] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [recurringSuccess, setRecurringSuccess] = useState(false);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [monthOfYear, setMonthOfYear] = useState("1");
  const [dayOfYear, setDayOfYear] = useState("1");

  const openRecurringStep = () => {
    const inferredDay = new Date(formData.date + "T00:00:00Z").getUTCDate().toString();
    setDayOfMonth(inferredDay);
    setIsRecurringOpen(true);
  };

  const handleMakeRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecurringSubmitting(true);
    setRecurringError(null);

    const result = await createRecurringTransaction({
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
    });

    setIsRecurringSubmitting(false);
    if (result.error) {
      setRecurringError(result.error);
    } else {
      setRecurringSuccess(true);
      setTimeout(() => {
        setRecurringSuccess(false);
        setIsRecurringOpen(false);
        setIsEditOpen(false);
        setFrequency("MONTHLY");
        setDayOfMonth("");
        setDayOfWeek("1");
        setMonthOfYear("1");
        setDayOfYear("1");
      }, 1500);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await updateTransaction(transaction.date, transaction.id, {
      description: formData.description,
      amount: Number(formData.amount),
      date: formData.date,
      category: formData.category,
      transactionType: formData.transactionType,
      accountId: formData.accountId || undefined,
    }, transaction.sk);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setIsEditOpen(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    await deleteTransaction(transaction.date, transaction.id, transaction.sk);
    setIsSubmitting(false);
    setIsDeleteOpen(false);
    onDelete?.(transaction.id);
  };

  const handleCategorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (categorizeData.updateExisting) {
      const result = await recategorizeByDescription(
        transaction.description,
        categorizeData.category,
        transaction.transactionType ?? "EXPENSE",
      );

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
    } else {
      const result = await updateTransaction(transaction.date, transaction.id, {
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        category: categorizeData.category,
        transactionType: transaction.transactionType ?? "EXPENSE",
        accountId: transaction.accountId,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
    }

    if (categorizeData.saveRule) {
      await saveCategoryRule(
        transaction.description,
        categorizeData.category,
        transaction.transactionType ?? "EXPENSE",
      );
    }

    onCategoryUpdate?.(transaction.id, categorizeData.category);
    setIsSubmitting(false);
    setIsCategorizeOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsCategorizeOpen(true)}>
            <Tag className="mr-2 h-4 w-4" />
            Categorize
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setIsEditOpen(true); openRecurringStep(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Make Recurring
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setIsRecurringOpen(false);
          setRecurringError(null);
          setRecurringSuccess(false);
        }
      }}>
        <DialogContent className="sm:max-w-106.25 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isRecurringOpen ? "Make Recurring" : "Edit Transaction"}</DialogTitle>
          </DialogHeader>

          {!isRecurringOpen ? (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="flex rounded-md border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (formData.transactionType !== "EXPENSE")
                      setFormData({ ...formData, transactionType: "EXPENSE", category: "" });
                  }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    formData.transactionType === "EXPENSE"
                      ? "bg-destructive/15 text-destructive"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.transactionType !== "INCOME")
                      setFormData({ ...formData, transactionType: "INCOME", category: "" });
                  }}
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
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
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
                  <option value="" disabled>Select a category...</option>
                  {initialCategories
                    .filter((c) => (c.categoryType ?? "EXPENSE") === formData.transactionType)
                    .map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
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
                  {initialAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={openRecurringStep}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Make Recurring
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleMakeRecurring} className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium truncate">{formData.description}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  ${Number(formData.amount).toFixed(2)} · {formData.category} · {formData.transactionType}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  The original transaction is kept. This creates a new recurring schedule.
                </p>
              </div>
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
              {recurringError && <p className="text-sm text-destructive">{recurringError}</p>}
              {recurringSuccess && <p className="text-sm text-success">Recurring transaction created.</p>}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsRecurringOpen(false); setRecurringError(null); }}
                  disabled={isRecurringSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isRecurringSubmitting}>
                  {isRecurringSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    "Create Recurring"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCategorizeOpen} onOpenChange={(open) => {
        setIsCategorizeOpen(open);
        setError(null);
      }}>
        <DialogContent className="sm:max-w-90">
          <DialogHeader>
            <DialogTitle>Set Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">{transaction.description}</p>
          <form onSubmit={handleCategorize} className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none text-muted-foreground">
                Category
              </label>
              <select
                required
                value={categorizeData.category}
                onChange={(e) => setCategorizeData({ ...categorizeData, category: e.target.value })}
                className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              >
                <option value="" disabled>Select a category...</option>
                {initialCategories
                  .filter((c) => (c.categoryType ?? "EXPENSE") === (transaction.transactionType ?? "EXPENSE"))
                  .map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={categorizeData.saveRule}
                onChange={(e) => setCategorizeData({ ...categorizeData, saveRule: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-muted-foreground">Remember for future imports</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={categorizeData.updateExisting}
                onChange={(e) => setCategorizeData({ ...categorizeData, updateExisting: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-muted-foreground">Update all existing transactions</span>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              transaction "{transaction.description}" for ${transaction.amount}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
