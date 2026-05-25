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
}

type Tab = "EXPENSE" | "INCOME";

export function LogPanel({ categories, accounts, onSuccess }: LogPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("EXPENSE");

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

      <TransactionForm
        key={activeTab}
        categories={activeCategories}
        accounts={accounts}
        initialType={activeTab}
        hideTypeToggle
        onSuccess={onSuccess}
      />
      <div className="pt-4 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Bulk Import
        </p>
        <CsvUploader />
      </div>
    </div>
  );
}
