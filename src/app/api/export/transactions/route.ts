import { NextResponse } from "next/server";
import Papa from "papaparse";
import { auth } from "@/auth";
import { getAllTransactions } from "@/app/actions/transactions";
import { Transaction } from "@/lib/data/budget";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await getAllTransactions();
  if ("error" in response && response.error) {
    return NextResponse.json({ error: response.error }, { status: 500 });
  }

  const transactions = (response.transactions ?? []).map((tx: Transaction) => ({
    Date: tx.date,
    Description: tx.description,
    Category: tx.category,
    Amount: tx.amount,
  }));

  const csv = Papa.unparse(transactions);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
