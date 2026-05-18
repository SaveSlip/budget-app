"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type HouseholdTransactionRow = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  transactionType?: "INCOME" | "EXPENSE";
  memberName: string;
  addedByName?: string;
  createdAt: string;
};

function HeaderLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  );
}

export const columns: ColumnDef<HouseholdTransactionRow>[] = [
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
    accessorKey: "memberName",
    header: () => <HeaderLabel>Member</HeaderLabel>,
    cell: ({ row }) => {
      const memberName = row.getValue("memberName") as string;
      const addedByName = row.original.addedByName;
      const addedByDiffers = addedByName && addedByName !== memberName;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground">{memberName}</span>
          {addedByDiffers && (
            <span className="text-xs text-muted-foreground">
              added by {addedByName}
            </span>
          )}
        </div>
      );
    },
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
      const isIncome = row.original.transactionType === "INCOME";
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      return (
        <span
          className={`flex justify-end pr-3 font-mono text-sm font-semibold tracking-tighter ${
            isIncome ? "text-green-500" : "text-red-500"
          }`}
        >
          {isIncome ? "+" : "-"}
          {formatted}
        </span>
      );
    },
  },
];
