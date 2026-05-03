import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Transaction {
  pk: string;
  sk: string;
  amount: number;
  description: string;
  date: string;
  categoryId: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/50">
      <Table>
        <TableHeader className="bg-zinc-900/50">
          <TableRow className="hover:bg-transparent border-zinc-800">
            <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider">
              Date
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider">
              Description
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider">
              Category
            </TableHead>
            <TableHead className="text-right text-xs font-bold uppercase tracking-wider">
              Amount
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No verified transactions found for this period.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => (
              <TableRow
                key={tx.sk}
                className="border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
              >
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(tx.date), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="text-sm font-medium leading-none">
                  {tx.description}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                    {tx.categoryId}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-sm font-semibold tracking-tighter",
                    "text-zinc-100",
                  )}
                >
                  $
                  {tx.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
