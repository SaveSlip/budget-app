"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createRecurringTransaction } from "@/app/actions/recurring";
import { setTransactionRecurring } from "@/app/actions/recurring";
import type { Transaction } from "@/app/dashboard/transactions/columns";

interface RecurringToggleProps {
  transaction: Transaction;
  onRecurringUpdate?: (txId: string, isRecurring: boolean) => void;
}

export function RecurringToggle({ transaction, onRecurringUpdate }: RecurringToggleProps) {
  const [isRecurring, setIsRecurring] = useState(transaction.isRecurring ?? false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Recurring form state
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState(() =>
    new Date(transaction.date + "T00:00:00Z").getUTCDate().toString()
  );
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [monthOfYear, setMonthOfYear] = useState("1");
  const [dayOfYear, setDayOfYear] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function openDialog() {
    setPopoverOpen(false);
    setDialogOpen(true);
    setError(null);
    setSuccess(false);
  }

  async function handleRemove() {
    setRemoving(true);
    setPopoverOpen(false);
    if (transaction.sk) {
      await setTransactionRecurring(transaction.sk, false);
    }
    setIsRecurring(false);
    onRecurringUpdate?.(transaction.id, false);
    setRemoving(false);
  }

  async function handleMakeRecurring(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createRecurringTransaction({
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      transactionType: transaction.transactionType ?? "EXPENSE",
      accountId: transaction.accountId || undefined,
      frequency,
      dayOfMonth: frequency === "MONTHLY" && dayOfMonth ? parseInt(dayOfMonth, 10) : undefined,
      dayOfWeek: frequency === "WEEKLY" ? parseInt(dayOfWeek, 10) : undefined,
      monthOfYear: frequency === "YEARLY" ? parseInt(monthOfYear, 10) : undefined,
      dayOfYear: frequency === "YEARLY" ? parseInt(dayOfYear, 10) : undefined,
      isActive: true,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    if (transaction.sk) {
      await setTransactionRecurring(transaction.sk, true);
    }

    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => {
      setSuccess(false);
      setDialogOpen(false);
      setIsRecurring(true);
      onRecurringUpdate?.(transaction.id, true);
      setFrequency("MONTHLY");
      setDayOfMonth(new Date(transaction.date + "T00:00:00Z").getUTCDate().toString());
      setDayOfWeek("1");
      setMonthOfYear("1");
      setDayOfYear("1");
    }, 1200);
  }

  return (
    <>
      <DropdownMenu open={popoverOpen} onOpenChange={setPopoverOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={`inline-flex items-center justify-center h-6 w-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isRecurring
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground/40 hover:text-muted-foreground"
            }`}
            aria-label={isRecurring ? "Recurring — click to manage" : "Not recurring — click to set up"}
          >
            {removing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {isRecurring ? "Recurring" : "Not recurring"}
          </p>
          {isRecurring ? (
            <Button
              variant="destructive"
              size="sm"
              className="w-full text-xs h-7"
              onClick={handleRemove}
              disabled={removing}
            >
              Remove recurring
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs h-7"
              onClick={openDialog}
            >
              Make Recurring
            </Button>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setError(null); setSuccess(false); }
      }}>
        <DialogContent className="sm:max-w-106.25 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Make Recurring</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMakeRecurring} className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium truncate">{transaction.description}</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                ${Math.abs(transaction.amount).toFixed(2)} · {transaction.category} · {transaction.transactionType ?? "EXPENSE"}
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-success">Recurring transaction created.</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || success}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Create Recurring"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
