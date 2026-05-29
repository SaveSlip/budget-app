import Link from "next/link";
import { BudgetProgress } from "@/components/BudgetProgress";
import { Category } from "@/lib/data/budget";

interface Props {
  categories: Category[];
  spendingMap: Record<string, number>;
  adjustedCategoryLimits: Record<string, number>;
  rolloverDeltas: Record<string, number>;
  activeMonth: string;
  activeYear: string;
  view: string;
}

const PAGE_SIZE = 4;

export function BudgetBenchmarking({
  categories,
  spendingMap,
  adjustedCategoryLimits,
  rolloverDeltas,
  activeMonth,
  activeYear,
  view,
}: Props) {
  const visible = categories.slice(0, PAGE_SIZE);
  const hiddenCount = categories.length - PAGE_SIZE;

  const benchmarkHref =
    `/dashboard/benchmarking?month=${activeMonth}&view=${view}&year=${activeYear}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((category) => (
          <Link
            key={category.id}
            href={`${benchmarkHref}&category=${encodeURIComponent(category.name)}`}
            className="block"
          >
            <BudgetProgress
              categoryName={category.name}
              limit={category.limit || 0}
              adjustedLimit={adjustedCategoryLimits[category.name] ?? category.limit ?? 0}
              rolloverDelta={rolloverDeltas[category.name] ?? 0}
              spent={spendingMap[category.name] || 0}
              isUniversal={category.isUniversal}
              categoryId={category.id}
            />
          </Link>
        ))}
      </div>
      {hiddenCount > 0 && (
        <Link
          href={benchmarkHref}
          className="self-start text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Show {hiddenCount} more →
        </Link>
      )}
    </div>
  );
}
