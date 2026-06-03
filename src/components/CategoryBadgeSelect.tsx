"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  updateTransaction,
  recategorizeByDescription,
  countTransactionsByDescription,
} from "@/app/actions/transactions";
import { saveCategoryRule } from "@/app/actions/categoryRules";
import { extractMerchant } from "@/lib/transactionUtils";
import type { Category } from "@/lib/data/budget";
import type { Transaction } from "@/app/dashboard/transactions/columns";

interface CategoryBadgeSelectProps {
  transaction: Transaction;
  initialCategories: Category[];
  onCategoryUpdate?: (txId: string, category: string) => void;
}

export function CategoryBadgeSelect({
  transaction,
  initialCategories,
  onCategoryUpdate,
}: CategoryBadgeSelectProps) {
  const [currentCategory, setCurrentCategory] = useState(transaction.category);
  const [open, setOpen] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [applyToAll, setApplyToAll] = useState(true);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredCategories = initialCategories.filter(
    (c) => (c.categoryType ?? "EXPENSE") === (transaction.transactionType ?? "EXPENSE"),
  );

  function handleSelect(categoryName: string) {
    if (categoryName === currentCategory) {
      setOpen(false);
      return;
    }
    setPendingCategory(categoryName);
    setApplyToAll(true);
    setMatchCount(null);
    setSuccessMsg(null);
    countTransactionsByDescription(
      transaction.description,
      transaction.transactionType ?? "EXPENSE",
    ).then((r) => setMatchCount(r.count ?? null));
  }

  async function handleApply() {
    if (!pendingCategory) return;
    setConfirming(true);

    const result = await updateTransaction(
      transaction.date,
      transaction.id,
      {
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        category: pendingCategory,
        transactionType: transaction.transactionType ?? "EXPENSE",
        accountId: transaction.accountId,
      },
      transaction.sk,
    );

    if (!result.error) {
      await saveCategoryRule(
        extractMerchant(transaction.description),
        pendingCategory,
        transaction.transactionType ?? "EXPENSE",
      );

      if (applyToAll) {
        const bulk = await recategorizeByDescription(
          transaction.description,
          pendingCategory,
          transaction.transactionType ?? "EXPENSE",
        );
        const n = bulk.count ?? 1;
        setSuccessMsg(`Updated ${n} transaction${n !== 1 ? "s" : ""}`);
      } else {
        setSuccessMsg("Category updated");
      }

      setCurrentCategory(pendingCategory);
      onCategoryUpdate?.(transaction.id, pendingCategory);
    }

    setConfirming(false);
    setTimeout(() => {
      setOpen(false);
      setPendingCategory(null);
      setSuccessMsg(null);
    }, 1200);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPendingCategory(null);
      setSuccessMsg(null);
    }
    setOpen(next);
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
          aria-label={`Category: ${currentCategory}. Click to change.`}
        >
          <Badge variant="secondary" className="cursor-pointer select-none pr-1.5">
            {confirming ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            {currentCategory}
            <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64"
        onInteractOutside={(e) => { if (pendingCategory) e.preventDefault(); }}
        onPointerDownOutside={(e) => { if (pendingCategory) e.preventDefault(); }}
      >
        {pendingCategory ? (
          <div className="px-2 py-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-1">
              Change to{" "}
              <span className="text-foreground font-semibold">{pendingCategory}</span>
            </p>
            <label className="flex items-start gap-2 cursor-pointer px-1">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-xs leading-snug">
                Also update{" "}
                {matchCount === null ? (
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                ) : (
                  <span className="font-medium">{matchCount}</span>
                )}{" "}
                {matchCount === 1 ? "transaction" : "transactions"} named{" "}
                <span className="font-medium">"{transaction.description}"</span>
              </span>
            </label>
            {successMsg ? (
              <p className="text-xs text-green-500 px-1">{successMsg}</p>
            ) : (
              <Button
                size="sm"
                className="w-full h-7 text-xs"
                onClick={handleApply}
                disabled={confirming}
              >
                {confirming ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Apply
              </Button>
            )}
          </div>
        ) : (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Change category
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-64 overflow-y-auto">
              {filteredCategories.map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => handleSelect(cat.name)}
                  className="flex items-center justify-between gap-4"
                >
                  <span>{cat.name}</span>
                  {cat.name === currentCategory && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
