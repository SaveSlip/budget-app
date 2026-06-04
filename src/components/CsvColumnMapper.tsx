"use client";

import * as React from "react";
import { ImportStepper } from "@/components/ImportStepper";
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

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  expenseAmount: string;
  incomeAmount: string;
  type: string; // "auto" | a CSV header name
}

const NONE_VALUE = "__none__";

const DATE_ALIASES = ["date", "transaction date", "posted date", "trans date", "posting date"];
const DESCRIPTION_ALIASES = ["description", "name", "memo", "payee", "narrative", "merchant"];
const AMOUNT_ALIASES = ["amount", "value", "cad$", "usd$", "transaction amount"];
const TYPE_ALIASES = ["type", "debit/credit", "transaction type", "credit/debit"];
const EXPENSE_AMOUNT_ALIASES = [
  "debit", "debit amount", "withdrawal", "withdrawals",
  "debit (cad$)", "debit (usd$)", "amount debit", "dr",
];
const INCOME_AMOUNT_ALIASES = [
  "credit", "credit amount", "deposit", "deposits",
  "credit (cad$)", "credit (usd$)", "amount credit", "cr",
];

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((h) => h.toLowerCase().trim());

  const findHeader = (aliases: string[]) =>
    headers[normalized.findIndex((h) => aliases.includes(h))] ?? "";

  // Headerless synthetic columns (col1, col2, ...)
  const isSynthetic = headers.every((h) => /^col\d+$/.test(h));
  if (isSynthetic) {
    return {
      date: headers[0] ?? "",
      description: headers[1] ?? "",
      amount: "",
      expenseAmount: headers[2] ?? "",
      incomeAmount: headers[3] ?? "",
      type: "auto",
    };
  }

  const detectedExpense = findHeader(EXPENSE_AMOUNT_ALIASES);
  const detectedIncome = findHeader(INCOME_AMOUNT_ALIASES);
  const hasSplitColumns = detectedExpense !== "" && detectedIncome !== "";

  const detectedType = findHeader(TYPE_ALIASES);

  return {
    date: findHeader(DATE_ALIASES),
    description: findHeader(DESCRIPTION_ALIASES),
    amount: hasSplitColumns ? "" : findHeader(AMOUNT_ALIASES),
    expenseAmount: detectedExpense,
    incomeAmount: detectedIncome,
    type: detectedType || "auto",
  };
}

interface FieldRowProps {
  label: string;
  hint: string;
  value: string;
  headers: string[];
  includeAuto?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function FieldRow({ label, hint, value, headers, includeAuto = false, disabled = false, onChange }: FieldRowProps) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0 ${disabled ? "opacity-40" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0 w-44">
        <Select value={value === "" ? NONE_VALUE : value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="w-full bg-muted border-border text-sm">
            <SelectValue placeholder="Select a column…" />
          </SelectTrigger>
          <SelectContent>
            {includeAuto && (
              <SelectItem value="auto">Auto (from sign)</SelectItem>
            )}
            <SelectItem value={NONE_VALUE}>— None —</SelectItem>
            {headers.filter(Boolean).map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface CsvColumnMapperProps {
  filename: string;
  csvHeaders: string[];
  initialMapping: ColumnMapping;
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

export function CsvColumnMapper({
  filename,
  csvHeaders,
  initialMapping,
  onConfirm,
  onCancel,
}: CsvColumnMapperProps) {
  const [mapping, setMapping] = React.useState<ColumnMapping>(initialMapping);

  const update = (field: keyof ColumnMapping) => (value: string) =>
    setMapping((prev) => ({ ...prev, [field]: value === NONE_VALUE ? "" : value }));

  const usingSplitColumns = mapping.expenseAmount !== "" || mapping.incomeAmount !== "";

  const hasAmounts =
    mapping.amount !== "" ||
    (mapping.expenseAmount !== "" && mapping.incomeAmount !== "");

  const canConfirm = mapping.date !== "" && mapping.description !== "" && hasAmounts;

  return (
    <div className="space-y-3">
      <ImportStepper currentStep={2} />
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-base font-bold text-foreground">Map your CSV columns</CardTitle>
        <CardDescription className="text-xs text-muted-foreground truncate">
          {filename}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        <FieldRow
          label="Date"
          hint="The transaction date"
          value={mapping.date}
          headers={csvHeaders}
          onChange={update("date")}
        />
        <FieldRow
          label="Description"
          hint="Merchant or payee name"
          value={mapping.description}
          headers={csvHeaders}
          onChange={update("description")}
        />
        <FieldRow
          label="Amount"
          hint={usingSplitColumns ? "Disabled — using split columns below" : "Single signed amount column"}
          value={mapping.amount}
          headers={csvHeaders}
          onChange={update("amount")}
          disabled={usingSplitColumns}
        />
        <FieldRow
          label="Expense / Debit column"
          hint="For banks with separate debit and credit columns (optional)"
          value={mapping.expenseAmount}
          headers={csvHeaders}
          onChange={update("expenseAmount")}
        />
        <FieldRow
          label="Income / Credit column"
          hint="For banks with separate debit and credit columns (optional)"
          value={mapping.incomeAmount}
          headers={csvHeaders}
          onChange={update("incomeAmount")}
        />
        <FieldRow
          label="Type"
          hint="Income / Expense (optional)"
          value={mapping.type}
          headers={csvHeaders}
          includeAuto
          onChange={update("type")}
        />
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pb-5 pt-3">
        <Button
          onClick={() => onConfirm(mapping)}
          disabled={!canConfirm}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          Continue
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 text-sm"
        >
          Cancel &amp; re-upload
        </Button>
      </CardFooter>
    </Card>
    </div>
  );
}
