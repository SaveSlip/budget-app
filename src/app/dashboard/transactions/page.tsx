import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTransactionsBatch, getAvailableMonths } from "@/app/actions/transactions";
import { listRecurringTransactions } from "@/app/actions/recurring";
import { getCategories, getAccounts } from "@/lib/data/budget";
import { type Transaction } from "./columns";
import { TransactionsTabView } from "@/components/TransactionsTabView";

interface PageProps {
  searchParams: Promise<{ month?: string; view?: string; year?: string }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const [batchResponse, categories, accounts, resolvedParams, availableMonths, recurring] = await Promise.all([
    getTransactionsBatch(undefined, 25),
    getCategories(),
    getAccounts(),
    searchParams,
    getAvailableMonths(),
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
        categories={categories}
        accounts={accounts}
        initialMonth={resolvedParams.month}
        initialView={resolvedParams.view}
        initialYear={resolvedParams.year}
        initialAvailableMonths={availableMonths}
        recurring={recurring}
      />
    </div>
  );
}
