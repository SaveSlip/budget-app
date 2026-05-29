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
import type { Transaction, Category, Account } from "@/lib/data/budget";
import { TransactionActions } from "@/components/TransactionActions";

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories?: Category[];
  accounts?: Account[];
  emptyMessage?: string;
  scrollable?: boolean;
}

export function RecentTransactions({ transactions, categories = [], accounts = [], emptyMessage, scrollable }: RecentTransactionsProps) {
  return (
    <div className={cn("rounded-md border border-border", scrollable && "max-h-130 overflow-y-auto")}>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Date
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Category
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Amount
            </TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                {emptyMessage ?? "No verified transactions found for this period."}
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => (
              <TableRow
                key={tx.sk}
                className="border-border hover:bg-accent transition-colors"
              >
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(tx.date), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="text-sm font-medium leading-none text-foreground">
                  {tx.description}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {tx.category}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-sm font-semibold tracking-tighter",
                    "text-foreground",
                  )}
                >
                  $
                  {tx.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <TransactionActions transaction={tx} initialCategories={categories} initialAccounts={accounts} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
