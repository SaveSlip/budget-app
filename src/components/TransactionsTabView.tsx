"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DataTable } from "@/app/dashboard/transactions/data-table";
import { LogPanel } from "@/components/LogPanel";
import { RecurringList } from "@/components/RecurringList";
import type { Transaction } from "@/app/dashboard/transactions/columns";
import type { Category, Account, RecurringTransaction } from "@/lib/data/budget";

type Tab = "ledger" | "recurring" | "add";

interface Props {
  transactions: Transaction[];
  initialCursor: string | null;
  categories: Category[];
  accounts: Account[];
  recurring: RecurringTransaction[];
  initialMonth?: string;
  initialView?: string;
  initialYear?: string;
  initialAvailableMonths?: string[];
  initialTab?: Tab;
  initialMode?: "csv" | "manual";
  initialQuery?: string;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "ledger", label: "Transaction Ledger" },
  { id: "recurring", label: "Recurring Transactions" },
  { id: "add", label: "Add Transaction" },
];

export function TransactionsTabView({ transactions, initialCursor, categories, accounts, recurring, initialMonth, initialView, initialYear, initialAvailableMonths, initialTab, initialMode, initialQuery }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "ledger");
  const [addWithRecurring, setAddWithRecurring] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTabMouseEnter = (id: Tab) => {
    if (id === activeTab) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    hoverTimer.current = setTimeout(() => {
      if (id !== "add") setAddWithRecurring(false);
      setActiveTab(id);
    }, 150);
  };

  const handleTabMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  const onImportCompleteRef = useRef<((month: string) => void) | null>(null);
  const handleImportComplete = useCallback((month: string) => {
    setActiveTab("ledger");
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    params.delete("view");
    startTransition(() => {
      router.push(`/dashboard/transactions?${params.toString()}`);
    });
  }, [router, searchParams]);

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      {/* Tab navigation */}
      <div className="flex border-b border-border px-6 pt-4">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { if (id !== "add") setAddWithRecurring(false); setActiveTab(id); }}
            onMouseEnter={() => handleTabMouseEnter(id)}
            onMouseLeave={handleTabMouseLeave}
            className={cn(
              "relative pb-3 px-1 mr-6 text-sm font-medium transition-colors",
              activeTab === id
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {id === "recurring" && recurring.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                {recurring.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <CardContent className="pt-6">
        {activeTab === "ledger" && (
          <DataTable data={transactions} initialCursor={initialCursor} embedded initialCategories={categories} initialAccounts={accounts} initialMonth={initialMonth} initialView={initialView} initialYear={initialYear} initialAvailableMonths={initialAvailableMonths} onImportCompleteRef={onImportCompleteRef} initialQuery={initialQuery} />
        )}
        {activeTab === "recurring" && (
          <RecurringList
            recurring={recurring}
            categories={categories}
            accounts={accounts}
            onAddRecurring={() => { setAddWithRecurring(true); setActiveTab("add"); }}
          />
        )}
        {activeTab === "add" && (
          <LogPanel categories={categories} accounts={accounts} onImportComplete={handleImportComplete} initialMode={initialMode} initialRecurring={addWithRecurring} />
        )}
      </CardContent>
    </Card>
  );
}
