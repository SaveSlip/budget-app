"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionActions } from "@/components/TransactionActions";
import type { Category, Account } from "@/lib/data/budget";

export type Transaction = {
  id: string;
  sk?: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  createdAt: string;
  transactionType?: "INCOME" | "EXPENSE";
  accountId?: string;
  importOrder?: number;
};

/** Shared header label style matching the RecentTransactions component. */
function HeaderLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  );
}

export function getColumns(
  initialCategories: Category[],
  initialAccounts: Account[],
  onCategoryUpdate?: (txId: string, category: string) => void,
  onDelete?: (txId: string) => void,
): ColumnDef<Transaction>[] {
  return [
  {
    id: "search",
    accessorFn: (row) => `${row.description} ${row.category}`,
    enableHiding: true,
    header: () => null,
    cell: () => null,
  },
  {
    accessorKey: "importOrder",
    enableHiding: true,
    enableSorting: true,
    header: () => null,
    cell: () => null,
    size: 0,
  },
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
        checked={table.getIsAllPageRowsSelected()}
        ref={(el) => {
          if (el) el.indeterminate = table.getIsSomePageRowsSelected();
        }}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="hover:bg-transparent -ml-3 px-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <HeaderLabel>Date</HeaderLabel>
        <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return (
        <span className="pl-3 text-sm text-foreground font-medium">
          {date.toLocaleDateString("en-US", { timeZone: "UTC" })}
        </span>
      );
    },
  },
  {
    accessorKey: "description",
    header: () => <HeaderLabel>Description</HeaderLabel>,
    cell: ({ row }) => (
      <span className="text-sm text-foreground font-medium leading-none">
        {row.getValue("description")}
      </span>
    ),
  },
  {
    accessorKey: "category",
    header: () => <HeaderLabel>Category</HeaderLabel>,
    cell: ({ row }) => (
      <Badge variant="secondary">{row.getValue("category")}</Badge>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <div className="flex justify-end">
        <Button
          variant="ghost"
          className="hover:bg-transparent -mr-3 px-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <HeaderLabel>Amount</HeaderLabel>
          <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const amount = Math.abs(parseFloat(row.getValue("amount")));
      const isIncome = (row.original.transactionType ?? "EXPENSE") === "INCOME";
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);

      return (
        <span className={`flex justify-end pr-3 font-mono text-sm font-semibold tracking-tighter ${isIncome ? "text-success" : "text-destructive"}`}>
          {isIncome ? "+" : "-"}{formatted}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const transaction = row.original;
      return (
        <div className="flex justify-end">
          <TransactionActions transaction={transaction} initialCategories={initialCategories} initialAccounts={initialAccounts} onCategoryUpdate={onCategoryUpdate} onDelete={onDelete} />
        </div>
      );
    },
  },
  ];
}
