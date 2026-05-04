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

export interface Transaction {
  pk: string;
  sk: string;
  id?: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  createdAt?: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-800">
      <Table>
        <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
          <TableRow className="hover:bg-transparent border-gray-200 dark:border-gray-800">
            <TableHead className="w-30 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Date
            </TableHead>
            <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Description
            </TableHead>
            <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Category
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Amount
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                No verified transactions found for this period.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => (
              <TableRow
                key={tx.sk}
                className="border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <TableCell className="text-xs text-gray-500 dark:text-gray-400">
                  {format(new Date(tx.date), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">
                  {tx.description}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    {tx.category}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-sm font-semibold tracking-tighter",
                    "text-gray-900 dark:text-gray-100",
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
