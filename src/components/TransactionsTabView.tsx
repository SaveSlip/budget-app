"use client";

import { useState, useCallback, useRef } from "react";
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
}

const TABS: { id: Tab; label: string }[] = [
  { id: "ledger", label: "Transaction Ledger" },
  { id: "recurring", label: "Recurring Transactions" },
  { id: "add", label: "Add Transaction" },
];

export function TransactionsTabView({ transactions, initialCursor, categories, accounts, recurring, initialMonth, initialView, initialYear, initialAvailableMonths, initialTab, initialMode }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "ledger");
  const [addWithRecurring, setAddWithRecurring] = useState(false);

  // Ref-based bridge: CsvUploader (in "add" tab) notifies DataTable (in "ledger" tab)
  // without either component needing to be mounted at the same time.
  const onImportCompleteRef = useRef<((month: string) => void) | null>(null);
  const handleImportComplete = useCallback((month: string) => {
    onImportCompleteRef.current?.(month);
    setActiveTab("ledger");
  }, []);

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      {/* Tab navigation */}
      <div className="flex border-b border-border px-6 pt-4">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { if (id !== "add") setAddWithRecurring(false); setActiveTab(id); }}
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
          <DataTable data={transactions} initialCursor={initialCursor} embedded initialCategories={categories} initialAccounts={accounts} initialMonth={initialMonth} initialView={initialView} initialYear={initialYear} initialAvailableMonths={initialAvailableMonths} onImportCompleteRef={onImportCompleteRef} />
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
