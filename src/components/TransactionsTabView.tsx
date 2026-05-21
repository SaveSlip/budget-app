"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DataTable } from "@/app/dashboard/transactions/data-table";
import { getColumns } from "@/app/dashboard/transactions/columns";
import { RecurringList } from "@/components/RecurringList";
import { RecurringTransactionForm } from "@/components/RecurringTransactionForm";
import type { Transaction } from "@/app/dashboard/transactions/columns";
import type { RecurringTransaction, Category, Account } from "@/lib/data/budget";

type Tab = "ledger" | "recurring";

interface Props {
  transactions: Transaction[];
  recurring: RecurringTransaction[];
  categories: Category[];
  accounts: Account[];
}

export function TransactionsTabView({ transactions, recurring, categories, accounts }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("ledger");

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      {/* Tab navigation */}
      <div className="flex border-b border-border px-6 pt-4">
        {(["ledger", "recurring"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative pb-3 px-1 mr-6 text-sm font-medium transition-colors",
              activeTab === tab
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "ledger" ? "Transaction Ledger" : "Recurring Transactions"}
            {tab === "recurring" && recurring.length > 0 && (
              <span className="ml-1.5 text-xs bg-primary/15 text-primary rounded-full px-1.5 py-0.5">
                {recurring.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <CardContent className="pt-6">
        {activeTab === "ledger" ? (
          <DataTable columns={getColumns(categories, accounts)} data={transactions} embedded />
        ) : (
          <div className="space-y-8">
            {recurring.length > 0 && (
              <RecurringList recurring={recurring} categories={categories} accounts={accounts} />
            )}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Add Recurring Transaction
              </h3>
              <RecurringTransactionForm categories={categories} accounts={accounts} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
