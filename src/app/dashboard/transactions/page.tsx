import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAllTransactions } from "@/app/actions/transactions";
import { listRecurringTransactions } from "@/app/actions/recurring";
import { getCategories, getAccounts } from "@/lib/data/budget";
import { columns, type Transaction } from "./columns";
import { DataTable } from "./data-table";
import { GlassCard } from "@/components/GlassCard";
import { RecurringTransactionForm } from "@/components/RecurringTransactionForm";
import { RecurringList } from "@/components/RecurringList";
import { FadeIn } from "@/components/FadeIn";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const [transactionsResponse, categories, accounts, recurring] = await Promise.all([
    getAllTransactions(),
    getCategories(),
    getAccounts(),
    listRecurringTransactions(),
  ]);

  const transactions = (transactionsResponse.transactions || []) as Transaction[];

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

      <FadeIn delay={0.1}>
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            Recurring Transactions
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Fixed expenses and income that repeat automatically each period.
          </p>
        </div>
      </FadeIn>

      {recurring.length > 0 && (
        <FadeIn delay={0.15}>
          <RecurringList recurring={recurring} categories={categories} accounts={accounts} />
        </FadeIn>
      )}

      <FadeIn delay={0.2}>
        <GlassCard title="Add Recurring Transaction">
          <RecurringTransactionForm categories={categories} accounts={accounts} />
        </GlassCard>
      </FadeIn>
    </div>
  );
}
