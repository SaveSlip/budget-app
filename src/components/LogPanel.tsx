"use client";

import { useState, useRef, useEffect } from "react";
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
  const [csvProcessing, setCsvProcessing] = useState(false);
  // Tracks the last measured height of the Manual Entry panel so Bulk Import can match it exactly.
  const [manualHeight, setManualHeight] = useState<number | null>(null);
  const manualPanelRef = useRef<HTMLDivElement>(null);

  // Measure Manual Entry panel height (including padding) via ResizeObserver so it stays
  // current even when the form grows (e.g. recurring checkbox expands it).
  useEffect(() => {
    const el = manualPanelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      setManualHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  // Re-attach whenever Manual Entry re-mounts (switching back from CSV tab).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
    <div className="border border-border rounded-lg overflow-hidden flex flex-col">

      {/* Tab bar */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => !csvProcessing && setMode("manual")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
            mode === "manual"
              ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Manual Entry
        </button>
        <button
          type="button"
          onClick={() => !csvProcessing && setMode("csv")}
          disabled={csvProcessing}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
            csvProcessing
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : mode === "csv"
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Bulk Import
        </button>
      </div>

      {/* Manual Entry panel — ref lets ResizeObserver track its height */}
      {mode === "manual" && (
        <div ref={manualPanelRef} className="px-6 pt-4 pb-6">
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
      )}

      {/* Bulk Import panel — fixed to the last measured Manual Entry height */}
      {mode === "csv" && (
        <div
          className="px-6 pt-4 pb-6 flex flex-col"
          style={manualHeight ? { height: manualHeight } : undefined}
        >
          <CsvUploader
            tall
            glowing={!csvProcessing}
            onActiveChange={setCsvProcessing}
            onImportComplete={onImportComplete}
            accounts={accounts}
          />
        </div>
      )}

    </div>
  );
}
