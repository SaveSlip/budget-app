"use client";

import { useState } from "react";
import TransactionForm from "@/components/TransactionForm";
import { CategoryForm } from "@/components/CategoryForm";
import CsvUploader from "@/components/CsvUploader";
import type { Account, Category } from "@/lib/data/budget";

interface LogPanelProps {
  categories: Category[];
  accounts: Account[];
}

type Tab = "EXPENSE" | "INCOME" | "CATEGORY";

export function LogPanel({ categories, accounts }: LogPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("EXPENSE");

  return (
    <div className="space-y-4">
      <div className="flex rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setActiveTab("EXPENSE")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === "EXPENSE"
              ? "bg-orange-500/15 text-orange-500"
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
              ? "bg-green-500/15 text-green-500"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Income
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("CATEGORY")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === "CATEGORY"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Budget Category
        </button>
      </div>

      {activeTab === "CATEGORY" ? (
        <CategoryForm />
      ) : (
        <>
          <TransactionForm
            categories={categories}
            accounts={accounts}
            initialType={activeTab}
            hideTypeToggle
          />
          <div className="pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Bulk Import
            </p>
            <CsvUploader />
          </div>
        </>
      )}
    </div>
  );
}
