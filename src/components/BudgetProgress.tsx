import { cn } from "@/lib/utils";

interface BudgetProgressProps {
  spent: number;
  limit: number;
  categoryName: string;
}

export function BudgetProgress({
  spent,
  limit,
  categoryName,
}: BudgetProgressProps) {
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const isOverBudget = limit > 0 && spent > limit;

  const getStatusColor = () => {
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 75) return "bg-warning";
    return "bg-primary";
  };

  return (
    <div className="space-y-2 w-full p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="flex justify-between items-end text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Category
          </span>
          <span className="font-bold text-lg leading-none">{categoryName}</span>
        </div>

        <div className="text-right">
          <span
            className={cn(
              "text-lg font-mono font-bold",
              isOverBudget ? "text-destructive" : "text-foreground",
            )}
          >
            ${spent.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-xs ml-1">
            / ${limit.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full w-full flex-1 transition-all duration-500",
            getStatusColor(),
          )}
          style={{
            transform: `translateX(-${100 - Math.min(percentage, 100)}%)`,
          }}
        />
      </div>

      {isOverBudget && (
        <p className="text-[10px] text-destructive font-bold uppercase animate-pulse">
          Limit Exceeded
        </p>
      )}
    </div>
  );
}
