"use client";

import { useState } from "react";
import TransactionForm from "@/components/TransactionForm";
import CsvUploader from "@/components/CsvUploader";
import { UNIVERSAL_INCOME_CATEGORIES } from "@/lib/constants/categories";
import type { Account, Category } from "@/lib/data/budget";

interface LogPanelProps {
  categories: Category[];
  accounts: Account[];
  onSuccess?: () => void;
  onImportComplete?: (month: string) => void;
}

type Tab = "EXPENSE" | "INCOME";

export function LogPanel({ categories, accounts, onSuccess, onImportComplete }: LogPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("EXPENSE");
  const [csvActive, setCsvActive] = useState(false);

  const incomeCategories: Category[] = UNIVERSAL_INCOME_CATEGORIES.map((uc) => ({
    id: uc.id,
    name: uc.name,
    limit: 0,
    type: "CATEGORY",
    createdAt: "",
    isUniversal: true,
  }));

  const activeCategories = activeTab === "INCOME" ? incomeCategories : categories;

  return (
    <div className="space-y-4">
      <div
        className={`overflow-hidden transition-all duration-300 ${
          csvActive ? "max-h-0 opacity-0 pointer-events-none" : "max-h-200 opacity-100"
        }`}
      >
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveTab("EXPENSE")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === "EXPENSE"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("INCOME")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === "INCOME"
                ? "bg-success/15 text-success"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Income
          </button>
        </div>

        <div className="mt-4">
          <TransactionForm
            key={activeTab}
            categories={activeCategories}
            accounts={accounts}
            initialType={activeTab}
            hideTypeToggle
            onSuccess={onSuccess}
          />
        </div>
      </div>

      <div className={csvActive ? "" : "pt-4 border-t border-border"}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Bulk Import
        </p>
        <CsvUploader onActiveChange={setCsvActive} onImportComplete={onImportComplete} />
      </div>
    </div>
  );
}
