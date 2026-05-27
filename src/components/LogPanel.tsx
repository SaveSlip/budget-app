"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import TransactionForm from "@/components/TransactionForm";
import CsvUploader from "@/components/CsvUploader";
import { UNIVERSAL_INCOME_CATEGORIES } from "@/lib/constants/categories";
import type { Account, Category } from "@/lib/data/budget";

interface LogPanelProps {
  categories: Category[];
  accounts: Account[];
  onSuccess?: () => void;
  onImportComplete?: (month: string) => void;
  initialMode?: "csv" | "manual";
  initialRecurring?: boolean;
}

type Tab = "EXPENSE" | "INCOME";

export function LogPanel({ categories, accounts, onSuccess, onImportComplete, initialMode, initialRecurring }: LogPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("EXPENSE");
  const [mode, setMode] = useState<"manual" | "csv">(initialMode === "csv" ? "csv" : "manual");
  // csvProcessing tracks mapping/preview/processing states in CsvUploader
  // so we keep the manual form hidden during those flows
  const [csvProcessing, setCsvProcessing] = useState(false);

  const incomeCategories: Category[] = UNIVERSAL_INCOME_CATEGORIES.map((uc) => ({
    id: uc.id,
    name: uc.name,
    limit: 0,
    type: "CATEGORY",
    createdAt: "",
    isUniversal: true,
  }));

  const activeCategories = activeTab === "INCOME" ? incomeCategories : categories;
  const manualCollapsed = mode === "csv" || csvProcessing;
  const csvCollapsed = mode === "manual" && !csvProcessing;

  const activeStyle = "text-primary bg-primary/5 shadow-[0_0_8px_1px_hsl(var(--primary)/0.10)]";
  const inactiveStyle = "text-muted-foreground hover:text-foreground hover:bg-accent/30";

  return (
    <div className="border border-border rounded-lg overflow-hidden min-h-150 flex flex-col">

      {/* Top header — Manual Entry */}
      <button
        type="button"
        onMouseEnter={() => !csvProcessing && setMode("manual")}
        onClick={() => !csvProcessing && setMode("manual")}
        className={`w-full px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider transition-all border-b border-border ${
          !manualCollapsed ? activeStyle : inactiveStyle
        }`}
      >
        <span className="flex items-center justify-between w-full">
          Manual Entry
          {manualCollapsed && <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Middle container — flex-1 keeps it filling all space between the two bars,
          so the Bulk Import footer never moves during transitions */}
      <div className="flex-1 overflow-hidden">

        {/* Manual entry form — collapses smoothly when CSV mode is active */}
        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out ${
            manualCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-225 opacity-100"
          }`}
          onFocus={() => setMode("manual")}
          onInput={() => setMode("manual")}
        >
          <div className="px-6 pt-4 pb-6">
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
                initialRecurring={initialRecurring}
              />
            </div>
          </div>
        </div>

        {/* CSV drop zone — fades in/out within the fixed flex-1 space (no height animation to avoid jump) */}
        <div
          className={`transition-opacity duration-300 ease-in-out ${
            csvCollapsed ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100"
          }`}
          onMouseEnter={() => !csvProcessing && setMode("csv")}
        >
          <div className="px-6 pt-4 pb-2">
            <CsvUploader
              glowing={mode === "csv" && !csvProcessing}
              onActiveChange={setCsvProcessing}
              onImportComplete={onImportComplete}
              tall={manualCollapsed}
            />
          </div>
        </div>

      </div>

      {/* Bottom footer — Bulk Import */}
      <button
        type="button"
        onMouseEnter={() => !csvProcessing && setMode("csv")}
        onClick={() => !csvProcessing && setMode("csv")}
        className={`w-full px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider transition-all border-t border-border ${
          manualCollapsed ? activeStyle : inactiveStyle
        }`}
      >
        <span className="flex items-center justify-between w-full">
          Bulk Import
          {!manualCollapsed && <ChevronUp className="w-3.5 h-3.5" />}
        </span>
      </button>

    </div>
  );
}
