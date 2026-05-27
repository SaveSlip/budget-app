"use client";

import { useState } from "react";
import { Trash, Loader2, RefreshCw, Pencil, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteRecurringTransaction,
  toggleRecurringTransaction,
} from "@/app/actions/recurring";
import type { RecurringTransaction, Category, Account } from "@/lib/data/budget";
import { GlassCard } from "@/components/GlassCard";
import { RecurringTransactionForm } from "@/components/RecurringTransactionForm";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function scheduleLabel(item: RecurringTransaction): string {
  switch (item.frequency) {
    case "DAILY":
      return "Every day";
    case "WEEKLY":
      return item.dayOfWeek !== undefined
        ? `Every ${DAY_NAMES[item.dayOfWeek]}`
        : "Every week";
    case "MONTHLY":
      return item.dayOfMonth
        ? `Every ${ordinal(item.dayOfMonth)}`
        : "Every month";
    case "YEARLY":
      return item.monthOfYear && item.dayOfYear
        ? `Every ${MONTH_NAMES[item.monthOfYear - 1]} ${ordinal(item.dayOfYear)}`
        : "Every year";
  }
}

interface RecurringListProps {
  recurring: RecurringTransaction[];
  categories?: Category[];
  accounts?: Account[];
  onAddRecurring?: () => void;
}

export function RecurringList({ recurring, categories = [], accounts = [], onAddRecurring }: RecurringListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteRecurringTransaction(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const handleToggle = async (id: string, current: boolean) => {
    setTogglingId(id);
    await toggleRecurringTransaction(id, !current);
    setTogglingId(null);
  };

  if (recurring.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <RefreshCw className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-1 max-w-xs">
          <p className="text-base font-semibold text-foreground">No recurring transactions yet</p>
          <p className="text-sm text-muted-foreground">
            Set up bills, subscriptions, or any payment that repeats on a schedule.
          </p>
        </div>
        {onAddRecurring && (
          <Button onClick={onAddRecurring} size="sm" className="mt-1 gap-1.5">
            Add a recurring transaction
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Recurring ({recurring.length})
      </h3>
      {recurring.map((item) => (
        <div key={item.id}>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-1.5 rounded-md bg-muted ${item.isActive ? "text-primary" : "text-muted-foreground"}`}>
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-none truncate ${item.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}>
                  {item.description}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {scheduleLabel(item)} · {item.category} · next: {typeof item.nextRunDate === "string" ? item.nextRunDate : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <span className={`font-mono text-sm font-semibold ${item.transactionType === "INCOME" ? "text-success" : "text-foreground"}`}>
                {item.transactionType === "INCOME" ? "+" : "-"}$
                {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>

              <button
                onClick={() => handleToggle(item.id, item.isActive)}
                disabled={togglingId === item.id}
                title={item.isActive ? "Pause" : "Resume"}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  item.isActive
                    ? "border-warning/40 text-warning hover:bg-warning/10"
                    : "border-success/40 text-success hover:bg-success/10"
                } disabled:opacity-50`}
              >
                {togglingId === item.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : item.isActive ? (
                  "Pause"
                ) : (
                  "Resume"
                )}
              </button>

              <button
                onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Edit recurring transaction"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {confirmDeleteId === item.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="text-xs px-2 py-0.5 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete recurring transaction"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {editingId === item.id && (
            <div className="mt-2 ml-4 pl-4 border-l-2 border-primary/20">
              <GlassCard>
                <RecurringTransactionForm
                  categories={categories}
                  accounts={accounts}
                  existing={item}
                  onSuccess={() => setEditingId(null)}
                />
              </GlassCard>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
