import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTransactionsBatch } from "@/app/actions/transactions";
import { listRecurringTransactions } from "@/app/actions/recurring";
import { getCategories, getAccounts } from "@/lib/data/budget";
import { type Transaction } from "./columns";
import { TransactionsTabView } from "@/components/TransactionsTabView";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const [batchResponse, categories, accounts, recurring] = await Promise.all([
    getTransactionsBatch(undefined, 25),
    getCategories(),
    getAccounts(),
    listRecurringTransactions(),
  ]);

  const transactions = (batchResponse.transactions || []) as Transaction[];

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
        initialCursor={batchResponse.nextCursor}
        recurring={recurring}
        categories={categories}
        accounts={accounts}
      />
    </div>
  );
}
