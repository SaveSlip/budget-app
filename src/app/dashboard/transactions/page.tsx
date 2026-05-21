import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAllTransactions } from "@/app/actions/transactions";
import { listRecurringTransactions } from "@/app/actions/recurring";
import { getCategories, getAccounts } from "@/lib/data/budget";
import { type Transaction } from "./columns";
import { TransactionsTabView } from "@/components/TransactionsTabView";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const [transactionsResponse, categories, accounts, recurring] = await Promise.all([
    getAllTransactions(),
    getCategories(),
    getAccounts(),
    listRecurringTransactions(),
  ]);

  const transactions = ((transactionsResponse.transactions || []) as Transaction[])
    .sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return b.createdAt.localeCompare(a.createdAt);
    });

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

      <TransactionsTabView
        transactions={transactions}
        recurring={recurring}
        categories={categories}
        accounts={accounts}
      />
    </div>
  );
}
