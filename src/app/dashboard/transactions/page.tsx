import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAllTransactions } from "@/app/actions/transactions";
import { columns, type Transaction } from "./columns";
import { DataTable } from "./data-table";

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
    </div>
  );
}
