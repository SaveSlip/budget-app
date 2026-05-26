"use client";

import { useState } from "react";
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
}

const TABS: { id: Tab; label: string }[] = [
  { id: "ledger", label: "Transaction Ledger" },
  { id: "recurring", label: "Recurring" },
  { id: "add", label: "Add Transaction" },
];

export function TransactionsTabView({ transactions, initialCursor, categories, accounts, recurring, initialMonth, initialView, initialYear, initialAvailableMonths }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("ledger");

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      {/* Tab navigation */}
      <div className="flex border-b border-border px-6 pt-4">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
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
          <DataTable data={transactions} initialCursor={initialCursor} embedded initialCategories={categories} initialAccounts={accounts} initialMonth={initialMonth} initialView={initialView} initialYear={initialYear} initialAvailableMonths={initialAvailableMonths} />
        )}
        {activeTab === "recurring" && (
          <RecurringList recurring={recurring} categories={categories} accounts={accounts} />
        )}
        {activeTab === "add" && (
          <LogPanel categories={categories} accounts={accounts} />
        )}
      </CardContent>
    </Card>
  );
}
