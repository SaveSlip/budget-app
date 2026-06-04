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
import type { DateFormat, AmountConvention, FormatOptions } from "@/lib/csvFormatUtils";

interface CsvFormatOptionsProps {
  filename: string;
  sampleDates: string[];
  hasTypeColumn: boolean;
  hasSplitColumns?: boolean;
  initialOptions: FormatOptions;
  onConfirm: (options: FormatOptions) => void;
  onBack: () => void;
}

interface FieldRowProps {
  label: string;
  hint: string;
  children: React.ReactNode;
}

function FieldRow({ label, hint, children }: FieldRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0 w-52">{children}</div>
    </div>
  );
}

export function CsvFormatOptions({
  filename,
  sampleDates,
  hasTypeColumn,
  hasSplitColumns = false,
  initialOptions,
  onConfirm,
  onBack,
}: CsvFormatOptionsProps) {
  const [dateFormat, setDateFormat] = React.useState<DateFormat>(initialOptions.dateFormat);
  const [amountConvention, setAmountConvention] = React.useState<AmountConvention>(
    initialOptions.amountConvention,
  );

  const sampleHint =
    sampleDates.length > 0
      ? `e.g. ${sampleDates.slice(0, 3).join(", ")}`
      : "No date samples detected";

  function handleConfirm() {
    onConfirm({
      dateFormat,
      amountConvention: hasSplitColumns
        ? "split-columns"
        : hasTypeColumn
          ? "type-column"
          : amountConvention,
    });
  }

  return (
    <div className="space-y-3">
      <ImportStepper currentStep={3} />
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-base font-bold text-foreground">
            Confirm format options
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground truncate">
            {filename}
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-2">
          <FieldRow
            label="Date format"
            hint={sampleHint}
          >
            <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormat)}>
              <SelectTrigger className="w-full bg-muted border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY — month first (US)</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY — day first (CA/UK)</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD — ISO / auto</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          {!hasTypeColumn && !hasSplitColumns && (
            <FieldRow
              label="Amount convention"
              hint="How your bank marks expenses"
            >
              <Select
                value={amountConvention}
                onValueChange={(v) => setAmountConvention(v as AmountConvention)}
              >
                <SelectTrigger className="w-full bg-muted border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="negative-expense">Negative = expense (−50.00)</SelectItem>
                  <SelectItem value="positive-expense">Positive = expense (debit)</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pb-5 pt-3">
          <Button
            onClick={handleConfirm}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            Continue
          </Button>
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 text-sm"
          >
            Back to column mapping
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
