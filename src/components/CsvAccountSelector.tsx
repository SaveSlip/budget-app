"use client";

import * as React from "react";
import { Loader2, PlusCircle, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAccount } from "@/app/actions/accounts";
import type { Account } from "@/lib/data/budget";
import { ImportStepper } from "@/components/ImportStepper";

const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Chequing" },
  { value: "SAVINGS", label: "Savings" },
  { value: "CREDIT", label: "Credit Card" },
  { value: "CASH", label: "Cash" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "OTHER", label: "Other" },
] as const;

const NO_ACCOUNT_VALUE = "__none__";
const CREATE_ACCOUNT_VALUE = "__create__";

interface CsvAccountSelectorProps {
  accounts: Account[];
  detectedAccountNumber: string | null;
  preSelectedAccountId: string | null;
  filename: string;
  onSelect: (accountId: string | null) => void;
  onBack: () => void;
}

export function CsvAccountSelector({
  accounts,
  detectedAccountNumber,
  preSelectedAccountId,
  filename,
  onSelect,
  onBack,
}: CsvAccountSelectorProps) {
  const [localAccounts, setLocalAccounts] = React.useState<Account[]>(accounts);
  const [selectedValue, setSelectedValue] = React.useState<string>(
    preSelectedAccountId ?? NO_ACCOUNT_VALUE,
  );
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [createFormData, setCreateFormData] = React.useState({
    name: "",
    type: "" as string,
    accountNumber: detectedAccountNumber ?? "",
  });
  const [isCreating, setIsCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const handleSelectChange = (value: string) => {
    if (value === CREATE_ACCOUNT_VALUE) {
      setShowCreateForm(true);
      setSelectedValue(CREATE_ACCOUNT_VALUE);
    } else {
      setShowCreateForm(false);
      setSelectedValue(value);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.type) {
      setCreateError("Please select an account type.");
      return;
    }
    setIsCreating(true);
    setCreateError(null);

    const result = await createAccount({
      name: createFormData.name,
      type: createFormData.type as (typeof ACCOUNT_TYPES)[number]["value"],
      initialBalance: 0,
      accountNumber: createFormData.accountNumber || undefined,
    });

    setIsCreating(false);

    if (result.error) {
      setCreateError(result.error);
      return;
    }

    const newAccount: Account = {
      id: result.id!,
      name: createFormData.name,
      accountType: createFormData.type as Account["accountType"],
      initialBalance: 0,
      accountNumber: createFormData.accountNumber || undefined,
      createdAt: new Date().toISOString(),
    };

    setLocalAccounts((prev) => [...prev, newAccount]);
    setSelectedValue(result.id!);
    setShowCreateForm(false);
  };

  const handleContinue = () => {
    const resolvedId =
      selectedValue === NO_ACCOUNT_VALUE || selectedValue === CREATE_ACCOUNT_VALUE
        ? null
        : selectedValue;
    onSelect(resolvedId);
  };

  const formatAccountLabel = (account: Account) => {
    const last4 = account.accountNumber
      ? ` · ****${account.accountNumber.slice(-4)}`
      : "";
    return `${account.name}${last4}`;
  };

  return (
    <div className="space-y-3">
      <ImportStepper currentStep={1} />
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-base font-bold text-foreground">
          Which account is this file from?
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground truncate">
          {filename}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2 space-y-4">
        {detectedAccountNumber && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            <span>
              Account number detected in CSV:{" "}
              <span className="font-medium text-foreground">
                ****{detectedAccountNumber.replace(/\D/g, "").slice(-4) || detectedAccountNumber}
              </span>
            </span>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Account</p>
          <Select value={selectedValue} onValueChange={handleSelectChange}>
            <SelectTrigger className="w-full bg-muted border-border text-sm">
              <SelectValue placeholder="Select an account…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ACCOUNT_VALUE}>No account (unassigned)</SelectItem>
              {localAccounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {formatAccountLabel(acc)}
                </SelectItem>
              ))}
              <SelectItem value={CREATE_ACCOUNT_VALUE}>
                <span className="flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create new account…
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateAccount} className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3">
            <p className="text-xs font-semibold text-foreground">New account</p>

            <div>
              <label className="text-xs text-muted-foreground">Account Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Chase Checking"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                className="flex h-9 w-full mt-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Account Type</label>
                <select
                  value={createFormData.type}
                  onChange={(e) => setCreateFormData({ ...createFormData, type: e.target.value })}
                  className="flex h-9 w-full mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  <option value="" disabled>Select type</option>
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Account # (optional)</label>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="e.g., 4242"
                  value={createFormData.accountNumber}
                  onChange={(e) => setCreateFormData({ ...createFormData, accountNumber: e.target.value })}
                  className="flex h-9 w-full mt-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {createError && <p className="text-xs text-destructive">{createError}</p>}

            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 py-1.5 w-full"
            >
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save & Select"}
            </button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pb-5 pt-3">
        <Button
          onClick={handleContinue}
          disabled={showCreateForm}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          Continue
        </Button>
        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 text-sm"
        >
          Cancel &amp; re-upload
        </Button>
      </CardFooter>
    </Card>
    </div>
  );
}
