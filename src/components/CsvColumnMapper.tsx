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
  type: string; // "auto" | a CSV header name
}

const DATE_ALIASES = ["date", "transaction date", "posted date", "trans date", "posting date"];
const DESCRIPTION_ALIASES = ["description", "name", "memo", "payee", "narrative", "merchant"];
const AMOUNT_ALIASES = ["amount", "value", "cad$", "usd$", "debit amount", "credit amount", "transaction amount"];
const TYPE_ALIASES = ["type", "debit/credit", "transaction type", "credit/debit"];

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((h) => h.toLowerCase().trim());

  const findHeader = (aliases: string[]) =>
    headers[normalized.findIndex((h) => aliases.includes(h))] ?? "";

  const detectedType = findHeader(TYPE_ALIASES);

  return {
    date: findHeader(DATE_ALIASES),
    description: findHeader(DESCRIPTION_ALIASES),
    amount: findHeader(AMOUNT_ALIASES),
    type: detectedType || "auto",
  };
}

interface FieldRowProps {
  label: string;
  hint: string;
  value: string;
  headers: string[];
  includeAuto?: boolean;
  onChange: (value: string) => void;
}

function FieldRow({ label, hint, value, headers, includeAuto = false, onChange }: FieldRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0 w-44">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full bg-muted border-border text-sm">
            <SelectValue placeholder="Select a column…" />
          </SelectTrigger>
          <SelectContent>
            {includeAuto && (
              <SelectItem value="auto">Auto (from sign)</SelectItem>
            )}
            {headers.map((h) => (
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
    setMapping((prev) => ({ ...prev, [field]: value }));

  const canConfirm = mapping.date !== "" && mapping.description !== "" && mapping.amount !== "";

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
          hint="Transaction amount"
          value={mapping.amount}
          headers={csvHeaders}
          onChange={update("amount")}
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
