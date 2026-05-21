"use client";

import { useState } from "react";
import { MoreHorizontal, Edit, Trash, Loader2 } from "lucide-react";
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
} from "@/app/actions/transactions";
import type { Account, Category } from "@/lib/data/budget";

type Transaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  createdAt: string;
  transactionType?: "INCOME" | "EXPENSE";
  accountId?: string;
};

interface TransactionActionsProps {
  transaction: Transaction;
  initialCategories: Category[];
  initialAccounts: Account[];
}

export function TransactionActions({ transaction, initialCategories, initialAccounts }: TransactionActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: transaction.description,
    amount: transaction.amount.toString(),
    date: transaction.date,
    category: transaction.category,
    transactionType: (transaction.transactionType ?? "EXPENSE") as "INCOME" | "EXPENSE",
    accountId: transaction.accountId ?? "",
  });


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
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setIsEditOpen(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    await deleteTransaction(transaction.date, transaction.id);
    setIsSubmitting(false);
    setIsDeleteOpen(false);
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
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/20"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
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
                    ? "bg-red-500/15 text-red-500"
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
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  "Save changes"
                )}
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
