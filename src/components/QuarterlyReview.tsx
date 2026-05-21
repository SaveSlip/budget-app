"use client";

import { useState, useTransition } from "react";
import { updateCategoryLimit, updateUniversalCategoryLimit } from "@/app/actions/categories";
import { cn } from "@/lib/utils";
import type { CategoryReviewSuggestion } from "@/lib/data/budget";

interface QuarterlyReviewProps {
  suggestions: CategoryReviewSuggestion[];
}

export function QuarterlyReview({ suggestions }: QuarterlyReviewProps) {
  const [dismissed, setDismissed] = useState(false);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [applyError, setApplyError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (dismissed || suggestions.length === 0) return null;

  const handleApply = (suggestion: CategoryReviewSuggestion) => {
    setApplyError(null);
    startTransition(async () => {
      const result = suggestion.isUniversal
        ? await updateUniversalCategoryLimit(suggestion.categoryId, suggestion.suggestedLimit)
        : await updateCategoryLimit(suggestion.categoryId, suggestion.suggestedLimit);
      if (result?.error) {
        setApplyError(result.error);
      } else {
        setApplied((prev) => new Set(prev).add(suggestion.categoryId));
      }
    });
  };

  return (
    <div className="border rounded-lg bg-card text-card-foreground shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base text-foreground">
            Quarterly Budget Review
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on your last 3 months of spending, we recommend adjusting these limits.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground text-xs ml-4 shrink-0"
        >
          Dismiss
        </button>
      </div>

      {applyError && (
        <p className="text-sm text-destructive">{applyError}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {suggestions.map((s) => {
          const isApplied = applied.has(s.categoryId);
          return (
            <div
              key={s.categoryId}
              className="flex items-center justify-between p-3 rounded-md border bg-muted/30 gap-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{s.categoryName}</p>
                <p className="text-[11px] text-muted-foreground">
                  Avg spend: ${s.avgMonthlySpend.toLocaleString(undefined, { maximumFractionDigits: 2 })} / mo
                </p>
                <p className="text-[11px]">
                  <span className="text-muted-foreground">
                    ${s.currentLimit.toLocaleString()} →{" "}
                  </span>
                  <span
                    className={cn(
                      "font-semibold",
                      s.action === "increase" ? "text-destructive" : "text-emerald-500",
                    )}
                  >
                    ${s.suggestedLimit.toLocaleString()}
                  </span>
                </p>
              </div>
              <button
                disabled={isApplied || pending}
                onClick={() => handleApply(s)}
                className={cn(
                  "shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors",
                  isApplied
                    ? "bg-muted text-muted-foreground cursor-default"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {isApplied ? "Applied" : "Apply"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
