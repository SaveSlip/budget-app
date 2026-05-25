"use client";

import { useState } from "react";
import { BudgetProgress } from "@/components/BudgetProgress";
import { Category } from "@/lib/data/budget";

interface Props {
  categories: Category[];
  spendingMap: Record<string, number>;
  adjustedCategoryLimits: Record<string, number>;
  rolloverDeltas: Record<string, number>;
}

const PAGE_SIZE = 8;

export function BudgetBenchmarking({
  categories,
  spendingMap,
  adjustedCategoryLimits,
  rolloverDeltas,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? categories : categories.slice(0, PAGE_SIZE);
  const hiddenCount = categories.length - PAGE_SIZE;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((category) => (
          <BudgetProgress
            key={category.id}
            categoryName={category.name}
            limit={category.limit || 0}
            adjustedLimit={adjustedCategoryLimits[category.name] ?? category.limit ?? 0}
            rolloverDelta={rolloverDeltas[category.name] ?? 0}
            spent={spendingMap[category.name] || 0}
            isUniversal={category.isUniversal}
            categoryId={category.id}
          />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="self-start text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? "Show less" : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}
