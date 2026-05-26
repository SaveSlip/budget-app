"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PreviewRowErrors = {
  description?: string;
  amount?: string;
  date?: string;
};

export interface PreviewRow {
  id: number;
  description: string;
  amount: string;
  date: string;
  category: string;
  transactionType: "INCOME" | "EXPENSE";
  errors: PreviewRowErrors;
  isSkipped: boolean;
  editingField: "description" | "amount" | null;
}

export function validatePreviewRow(row: PreviewRow): PreviewRowErrors {
  const errors: PreviewRowErrors = {};
  if (!row.description.trim()) errors.description = "Description is required";
  if (!/^\d+(\.\d{1,2})?$/.test(row.amount) || Number(row.amount) === 0)
    errors.amount = "Valid amount required";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) errors.date = "Invalid date";
  return errors;
}

interface CsvImportPreviewProps {
  rows: PreviewRow[];
  filename: string;
  onConfirmImport: (rows: PreviewRow[]) => void;
  onCancel: () => void;
  onChange: (rows: PreviewRow[]) => void;
}

export function CsvImportPreview({
  rows,
  filename,
  onConfirmImport,
  onCancel,
  onChange,
}: CsvImportPreviewProps) {
  const importableCount = rows.filter(
    (r) => !r.isSkipped && Object.keys(r.errors).length === 0,
  ).length;
  const errorCount = rows.filter(
    (r) => !r.isSkipped && Object.keys(r.errors).length > 0,
  ).length;

  function updateRow(id: number, patch: Partial<PreviewRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function startEdit(id: number, field: "description" | "amount") {
    onChange(rows.map((r) => (r.id === id ? { ...r, editingField: field } : r)));
  }

  function commitEdit(id: number, field: "description" | "amount", value: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const updated = { ...row, [field]: value, editingField: null as null };
    updated.errors = validatePreviewRow(updated);
    onChange(rows.map((r) => (r.id === id ? updated : r)));
  }

  function cancelEdit(id: number) {
    updateRow(id, { editingField: null });
  }

  function toggleSkip(id: number) {
    onChange(
      rows.map((r) => (r.id === id ? { ...r, isSkipped: !r.isSkipped } : r)),
    );
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-base font-bold text-foreground">
          Review import
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground truncate">
          {filename} &mdash;{" "}
          {errorCount > 0 ? (
            <span className="text-destructive font-medium">
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-success font-medium">all rows valid</span>
          )}
          {" · "}
          {importableCount} of {rows.length} rows will be imported
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2 px-3">
        <div className="max-h-72 overflow-y-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 text-center text-xs">#</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="w-10 text-center text-xs">Skip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const hasErrors = Object.keys(row.errors).length > 0;
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "text-xs",
                      row.isSkipped && "opacity-40",
                      hasErrors && !row.isSkipped && "bg-destructive/5",
                    )}
                  >
                    <TableCell className="text-center text-muted-foreground py-1.5">
                      {row.id + 1}
                    </TableCell>

                    {/* Date — display only, error badge below */}
                    <TableCell className="py-1.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className={cn(row.errors.date && "text-destructive")}>
                          {row.date || <span className="italic text-muted-foreground">—</span>}
                        </span>
                        {row.errors.date && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 w-fit">
                            {row.errors.date}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Description — inline editable */}
                    <TableCell className="py-1.5 max-w-[180px]">
                      <div className="flex flex-col gap-0.5">
                        {row.editingField === "description" ? (
                          <Input
                            autoFocus
                            defaultValue={row.description}
                            aria-invalid={!!row.errors.description}
                            className="h-6 text-xs px-1 py-0"
                            onBlur={(e) => commitEdit(row.id, "description", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                commitEdit(row.id, "description", e.currentTarget.value);
                              if (e.key === "Escape") cancelEdit(row.id);
                            }}
                          />
                        ) : (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => !row.isSkipped && startEdit(row.id, "description")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !row.isSkipped)
                                startEdit(row.id, "description");
                            }}
                            className={cn(
                              "truncate max-w-[160px] block",
                              !row.isSkipped && "cursor-text hover:underline underline-offset-2",
                              row.errors.description && "text-destructive",
                            )}
                          >
                            {row.description || (
                              <span className="italic text-muted-foreground">empty</span>
                            )}
                          </span>
                        )}
                        {row.errors.description && row.editingField !== "description" && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 w-fit">
                            {row.errors.description}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Amount — inline editable */}
                    <TableCell className="py-1.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        {row.editingField === "amount" ? (
                          <Input
                            autoFocus
                            defaultValue={row.amount}
                            aria-invalid={!!row.errors.amount}
                            className="h-6 text-xs px-1 py-0 w-20"
                            onBlur={(e) => commitEdit(row.id, "amount", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                commitEdit(row.id, "amount", e.currentTarget.value);
                              if (e.key === "Escape") cancelEdit(row.id);
                            }}
                          />
                        ) : (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => !row.isSkipped && startEdit(row.id, "amount")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !row.isSkipped)
                                startEdit(row.id, "amount");
                            }}
                            className={cn(
                              !row.isSkipped && "cursor-text hover:underline underline-offset-2",
                              row.errors.amount && "text-destructive",
                            )}
                          >
                            {row.amount || <span className="italic text-muted-foreground">—</span>}
                          </span>
                        )}
                        {row.errors.amount && row.editingField !== "amount" && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 w-fit">
                            {row.errors.amount}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-1.5">
                      <span
                        className={cn(
                          "text-xs",
                          row.transactionType === "EXPENSE"
                            ? "text-destructive"
                            : "text-success",
                        )}
                      >
                        {row.transactionType === "EXPENSE" ? "Exp" : "Inc"}
                      </span>
                    </TableCell>

                    <TableCell className="py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={row.isSkipped}
                        onChange={() => toggleSkip(row.id)}
                        aria-label="Skip this row"
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pb-5 pt-3">
        <Button
          onClick={() => onConfirmImport(rows)}
          disabled={importableCount === 0}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          Import {importableCount} of {rows.length} rows
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 text-sm"
        >
          Back to column mapping
        </Button>
      </CardFooter>
    </Card>
  );
}
