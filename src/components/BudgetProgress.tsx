"use client";

import { useState, useTransition } from "react";
import { Trash2, Pencil, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteCategory, updateCategory, updateUniversalCategoryLimit } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetProgressProps {
  spent: number;
  limit: number;
  adjustedLimit: number;
  rolloverDelta: number;
  categoryName: string;
  isUniversal?: boolean;
  categoryId?: string;
}

export function BudgetProgress({
  spent,
  limit,
  adjustedLimit,
  rolloverDelta,
  categoryName,
  isUniversal = false,
  categoryId,
}: BudgetProgressProps) {
  const effectiveLimit = adjustedLimit;
  const percentage = effectiveLimit > 0 ? (spent / effectiveLimit) * 100 : 0;
  const isOverBudget = effectiveLimit > 0 && spent > effectiveLimit;
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(categoryName);
  const [editLimit, setEditLimit] = useState(limit.toString());
  const [editError, setEditError] = useState<string | null>(null);
  const [universalEditOpen, setUniversalEditOpen] = useState(false);
  const [universalEditLimit, setUniversalEditLimit] = useState(limit.toString());
  const [universalEditError, setUniversalEditError] = useState<string | null>(null);

  function handleUniversalEditOpen() {
    setUniversalEditLimit(limit.toString());
    setUniversalEditError(null);
    setUniversalEditOpen(true);
  }

  function handleUniversalEditSave() {
    if (!categoryId) return;
    const parsedLimit = Number(universalEditLimit);
    if (isNaN(parsedLimit) || parsedLimit < 0) { setUniversalEditError("Limit must be 0 or greater"); return; }
    startTransition(async () => {
      const result = await updateUniversalCategoryLimit(categoryId, parsedLimit);
      if (result?.error) {
        setUniversalEditError(result.error);
      } else {
        setUniversalEditOpen(false);
      }
    });
  }

  const rolloverAbs = Math.abs(rolloverDelta);
  const showRollover = rolloverDelta !== 0;

  function handleDelete() {
    if (!categoryId) return;
    startTransition(async () => {
      await deleteCategory(categoryId);
      setDeleteOpen(false);
    });
  }

  function handleEditOpen() {
    setEditName(categoryName);
    setEditLimit(limit.toString());
    setEditError(null);
    setEditOpen(true);
  }

  function handleEditSave() {
    if (!categoryId) return;
    const parsedLimit = Number(editLimit);
    if (!editName.trim()) {
      setEditError("Name is required");
      return;
    }
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      setEditError("Limit must be 0 or greater");
      return;
    }
    startTransition(async () => {
      const result = await updateCategory(categoryId, {
        name: editName.trim(),
        limit: parsedLimit,
      });
      if (result?.error) {
        setEditError(result.error);
      } else {
        setEditOpen(false);
      }
    });
  }

  return (
    <div className="relative space-y-2 w-full p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
      {/* Top-right action: lock for universal, delete for custom */}
      <div className="absolute top-2 right-2">
        {isUniversal ? (
          <>
            <div className="flex items-center gap-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center h-6 w-6 text-muted-foreground/40 cursor-default">
                      <Lock className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    Universal categories can&apos;t be deleted
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground/40 hover:text-foreground"
                disabled={isPending}
                onClick={handleUniversalEditOpen}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <Dialog open={universalEditOpen} onOpenChange={setUniversalEditOpen}>
              <DialogContent className="sm:max-w-90">
                <DialogHeader>
                  <DialogTitle>Set Limit — {categoryName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Monthly Limit ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={universalEditLimit}
                      onChange={(e) => setUniversalEditLimit(e.target.value)}
                      className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>
                  {universalEditError && <p className="text-sm text-destructive">{universalEditError}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUniversalEditOpen(false)} disabled={isPending}>Cancel</Button>
                  <Button onClick={handleUniversalEditSave} disabled={isPending}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : categoryId ? (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground/40 hover:text-foreground"
              disabled={isPending}
              onClick={handleEditOpen}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground/40 hover:text-destructive"
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete category?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &quot;{categoryName}&quot;.
                    Past transactions assigned to it will not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="sm:max-w-90">
                <DialogHeader>
                  <DialogTitle>Edit Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Monthly Limit ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                      className="flex h-10 w-full mt-1.5 rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>
                  {editError && (
                    <p className="text-sm text-destructive">{editError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleEditSave} disabled={isPending}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      <div className="flex justify-between items-end text-sm pr-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Category
          </span>
          <span className="font-bold text-lg leading-none">{categoryName}</span>
          {showRollover && (
            <span
              className={cn(
                "text-[10px] font-semibold",
                rolloverDelta > 0 ? "text-emerald-500" : "text-destructive",
              )}
            >
              {rolloverDelta > 0 ? "+" : "-"}$
              {rolloverAbs.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              rolled over
            </span>
          )}
        </div>

        <div className="text-right">
          <span
            className={cn(
              "text-lg font-mono font-bold",
              isOverBudget ? "text-destructive" : "text-foreground",
            )}
          >
            ${spent.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-xs ml-1">
            / ${effectiveLimit.toLocaleString()}
          </span>
          {showRollover && (
            <p className="text-[10px] text-muted-foreground">
              base ${limit.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        {isOverBudget ? (
          <div className="h-full w-full bg-destructive" />
        ) : (
          <>
            <div
              className="absolute left-0 top-0 h-full bg-orange-500 transition-all duration-500"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
            <div
              className="absolute top-0 h-full bg-emerald-500 transition-all duration-500"
              style={{
                left: `${Math.min(percentage, 100)}%`,
                width: `${Math.max(100 - percentage, 0)}%`,
              }}
            />
          </>
        )}
      </div>

      {isOverBudget && (
        <p className="text-[10px] text-destructive font-bold uppercase animate-pulse">
          Limit Exceeded
        </p>
      )}
    </div>
  );
}
