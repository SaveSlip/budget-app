import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAllTransactions } from "@/app/actions/transactions";
import { getAccounts, getTransactionTrend } from "@/lib/data/budget";
import { columns, type Transaction } from "./columns";
import { DataTable } from "./data-table";
import { GlassCard } from "@/components/GlassCard";
import { AccountBalances } from "@/components/AccountBalances";
import { AccountForm } from "@/components/AccountForm";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const [response, accounts, allTrendItems] = await Promise.all([
    getAllTransactions(),
    getAccounts(),
    getTransactionTrend(24),
  ]);
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

      {/* Account Overview */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-6">
          Account Overview
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard title="Account Balances">
            <AccountBalances accounts={accounts} transactions={allTrendItems} />
          </GlassCard>
          <GlassCard title="Add Account">
            <AccountForm />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
