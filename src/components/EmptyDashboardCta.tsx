import Link from "next/link";
import { FileUp, PenLine } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

export function EmptyDashboardCta() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <GlassCard>
        <div className="flex flex-col items-start gap-4 p-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FileUp className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-base font-semibold text-foreground">Import from CSV</h3>
            <p className="text-sm text-muted-foreground">
              Upload your bank statement to get all your transactions in one go.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/dashboard/transactions?tab=add&mode=csv">Import from CSV →</Link>
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex flex-col items-start gap-4 p-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <PenLine className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-base font-semibold text-foreground">Add Manually</h3>
            <p className="text-sm text-muted-foreground">
              Enter a single transaction in seconds — no file needed.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard/transactions?tab=add&mode=manual">Add a transaction →</Link>
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
