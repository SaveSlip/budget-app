import Link from "next/link";
import { FileUp } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

export function EmptyDashboardCta() {
  return (
    <GlassCard>
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <FileUp className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">No transactions yet</h3>
          <p className="text-sm text-muted-foreground">
            Import your bank history to get started — it only takes a minute.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Button asChild>
            <Link href="/dashboard/transactions">Import from CSV →</Link>
          </Button>
          <Link
            href="/dashboard/transactions"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Add a transaction manually
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}
