import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllTransactions } from "@/app/actions/transactions";
import { columns, type Transaction } from "./columns";
import { DataTable } from "./data-table";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { CreditCard, RefreshCw, ArrowRight } from "lucide-react";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const response = await getAllTransactions();
  const transactions = (response.transactions || []) as Transaction[];

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto space-y-8 pt-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Transaction Ledger
        </h2>
        <p className="text-muted-foreground">
          View and manage all your historical financial activity.
        </p>
      </div>

      <DataTable columns={columns} data={transactions} />

      {/* Quick links to related settings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Accounts</p>
                <p className="text-xs text-muted-foreground">Manage your bank accounts</p>
              </div>
            </div>
            <Link href="/dashboard/settings/accounts">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Recurring</p>
                <p className="text-xs text-muted-foreground">Manage recurring transactions</p>
              </div>
            </div>
            <Link href="/dashboard/settings/recurring">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
