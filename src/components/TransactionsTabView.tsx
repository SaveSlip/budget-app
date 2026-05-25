"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DataTable } from "@/app/dashboard/transactions/data-table";
import { getColumns } from "@/app/dashboard/transactions/columns";
import { LogPanel } from "@/components/LogPanel";
import type { Transaction } from "@/app/dashboard/transactions/columns";
import type { Category, Account } from "@/lib/data/budget";

type Tab = "ledger" | "add";

interface Props {
  transactions: Transaction[];
  initialCursor: string | null;
  categories: Category[];
  accounts: Account[];
}

export function TransactionsTabView({ transactions, initialCursor, categories, accounts }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("ledger");

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      {/* Tab navigation */}
      <div className="flex border-b border-border px-6 pt-4">
        {(["ledger", "add"] as Tab[]).map((tab) => (
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
            {tab === "ledger" ? "Transaction Ledger" : "Add Transaction"}
          </button>
        ))}
      </div>

      <CardContent className="pt-6">
        {activeTab === "ledger" ? (
          <DataTable columns={getColumns(categories, accounts)} data={transactions} initialCursor={initialCursor} embedded initialCategories={categories} initialAccounts={accounts} />
        ) : (
          <LogPanel categories={categories} accounts={accounts} />
        )}
      </CardContent>
    </Card>
  );
}
