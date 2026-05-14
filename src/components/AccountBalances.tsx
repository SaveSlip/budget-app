"use client";

import { useState } from "react";
import { Trash, Loader2, CreditCard, Banknote, PiggyBank, TrendingUp, Wallet, MoreHorizontal } from "lucide-react";
import { deleteAccount } from "@/app/actions/accounts";
import type { Account, Transaction } from "@/lib/data/budget";

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  CHECKING: Banknote,
  SAVINGS: PiggyBank,
  CREDIT: CreditCard,
  CASH: Wallet,
  INVESTMENT: TrendingUp,
  OTHER: MoreHorizontal,
};

const ACCOUNT_COLORS: Record<string, string> = {
  CHECKING: "text-info",
  SAVINGS: "text-success",
  CREDIT: "text-primary",
  CASH: "text-warning",
  INVESTMENT: "text-chart-5",
  OTHER: "text-muted-foreground",
};

function computeBalance(account: Account, transactions: Transaction[]): number {
  const accountTxs = transactions.filter((tx) => tx.accountId === account.id);
  const net = accountTxs.reduce((sum, tx) => {
    const amount = Math.abs(Number(tx.amount) || 0);
    if (account.accountType === "CREDIT") {
      return tx.transactionType === "EXPENSE" ? sum + amount : sum - amount;
    }
    return tx.transactionType === "INCOME" ? sum + amount : sum - amount;
  }, 0);
  return account.initialBalance + net;
}

interface AccountBalancesProps {
  accounts: Account[];
  transactions: Transaction[];
}

export function AccountBalances({ accounts, transactions }: AccountBalancesProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteAccount(id);
    setDeletingId(null);
  };

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No accounts yet. Add one below to start tracking balances.
      </p>
    );
  }

  const totalNetWorth = accounts.reduce((sum, account) => {
    const balance = computeBalance(account, transactions);
    return account.accountType === "CREDIT" ? sum - balance : sum + balance;
  }, 0);

  return (
    <div className="space-y-3">
      {accounts.map((account) => {
        const balance = computeBalance(account, transactions);
        const Icon = ACCOUNT_ICONS[account.accountType] ?? MoreHorizontal;
        const colorClass = ACCOUNT_COLORS[account.accountType] ?? "text-muted-foreground";
        const isCredit = account.accountType === "CREDIT";
        const displayBalance = isCredit ? -balance : balance;

        return (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md bg-muted ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground leading-none">
                  {account.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {account.accountType.toLowerCase()}
                  {isCredit && " • debt"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`font-mono text-sm font-semibold ${
                  displayBalance >= 0 ? "text-foreground" : "text-destructive"
                }`}
              >
                {displayBalance < 0 ? "-" : ""}$
                {Math.abs(displayBalance).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <button
                onClick={() => handleDelete(account.id)}
                disabled={deletingId === account.id}
                className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                aria-label="Delete account"
              >
                {deletingId === account.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Net Worth
        </span>
        <span
          className={`font-mono text-sm font-bold ${
            totalNetWorth >= 0 ? "text-success" : "text-destructive"
          }`}
        >
          {totalNetWorth >= 0 ? "+" : "-"}$
          {Math.abs(totalNetWorth).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}
