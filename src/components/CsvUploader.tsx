"use client";

import { useState, DragEvent, useRef } from "react";
import Papa from "papaparse";
import { UploadCloud, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { batchCreateTransactions } from "@/app/actions/transactions";
import { getCategoryRules, type CategoryRule } from "@/app/actions/categoryRules";
import { applyUserRules, autoMatchCategory } from "@/lib/constants/categories";
import { CsvColumnMapper, autoDetectMapping, type ColumnMapping } from "@/components/CsvColumnMapper";
import {
  CsvImportPreview,
  validatePreviewRow,
  type PreviewRow,
} from "@/components/CsvImportPreview";

function filterCsvFiles(files: FileList | File[]): { valid: File[]; rejected: string[] } {
  const arr = Array.from(files);
  const valid = arr.filter((f) => f.type === "text/csv" || f.name.endsWith(".csv"));
  const rejected = arr
    .filter((f) => f.type !== "text/csv" && !f.name.endsWith(".csv"))
    .map((f) => f.name);
  return { valid, rejected };
}

function extractHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: 1,
      skipEmptyLines: true,
      complete: (results) => resolve(results.meta.fields ?? []),
      error: (err) => reject(new Error(err.message)),
    });
  });
}

function extractPreviewRows(
  file: File,
  rules: CategoryRule[],
  mapping: ColumnMapping,
  idOffset: number,
): Promise<PreviewRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let id = idOffset;
        const rows: PreviewRow[] = results.data.map((row: unknown) => {
          const normalizedRow: Record<string, string> = {};
          for (const key in row as Record<string, string>) {
            normalizedRow[key.toLowerCase().trim()] = (row as Record<string, string>)[key];
          }

          const descKey = mapping.description.toLowerCase().trim();
          const amtKey = mapping.amount.toLowerCase().trim();
          const dateKey = mapping.date.toLowerCase().trim();

          const description = normalizedRow[descKey]?.trim() ?? "";
          const rawAmount = Number(
            (normalizedRow[amtKey] || "0").replace(/[^0-9.-]+/g, ""),
          );
          const amountStr = rawAmount === 0 ? "0" : Math.abs(rawAmount).toString();

          let transactionType: "EXPENSE" | "INCOME";
          if (mapping.type === "auto") {
            transactionType = rawAmount < 0 ? "EXPENSE" : "INCOME";
          } else {
            const typeVal = (normalizedRow[mapping.type.toLowerCase().trim()] ?? "").toLowerCase();
            transactionType =
              typeVal.includes("debit") || typeVal.includes("expense") ? "EXPENSE" : "INCOME";
          }

          const rawDate = normalizedRow[dateKey] || "";
          const dateMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          const date = dateMatch
            ? `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`
            : rawDate.length > 10 && rawDate.includes("T")
              ? rawDate.split("T")[0]
              : rawDate;

          const category = normalizedRow.category?.trim()
            ? normalizedRow.category.trim()
            : (applyUserRules(description, transactionType, rules) ??
              autoMatchCategory(description, transactionType));

          const partial: PreviewRow = {
            id: id++,
            description,
            amount: amountStr,
            date,
            category,
            transactionType,
            errors: {},
            isSkipped: false,
            editingField: null,
          };
          partial.errors = validatePreviewRow(partial);
          return partial;
        });

        resolve(rows);
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

async function importValidRows(rows: PreviewRow[]): Promise<number> {
  const toImport = rows.filter(
    (r) => !r.isSkipped && Object.keys(r.errors).length === 0,
  );
  if (toImport.length === 0) return 0;

  const transactions = toImport.map((r) => ({
    description: r.description,
    amount: Number(r.amount),
    date: r.date,
    category: r.category,
    transactionType: r.transactionType,
  }));

  const result = await batchCreateTransactions(transactions);
  if (result.error) throw new Error(result.error);
  return result.count ?? 0;
}

type UploadState = "idle" | "dragging" | "processing" | "mapping" | "preview" | "success" | "error";

export default function CsvUploader() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [fileProgress, setFileProgress] = useState<string | null>(null);
  const [skippedWarning, setSkippedWarning] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingRejected, setPendingRejected] = useState<string[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState !== "processing") setUploadState("dragging");
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState !== "processing") setUploadState("idle");
  };

  const processFiles = async (files: FileList | File[]) => {
    const { valid, rejected } = filterCsvFiles(files);

    if (valid.length === 0) {
      setUploadState("error");
      setMessage(
        rejected.length === 1
          ? `"${rejected[0]}" is not a CSV file.`
          : `No valid CSV files selected.`,
      );
      setTimeout(() => {
        setUploadState("idle");
        setMessage(null);
      }, 3000);
      return;
    }

    try {
      const headers = await extractHeaders(valid[0]);
      const detected = autoDetectMapping(headers);
      setPendingFiles(valid);
      setPendingRejected(rejected);
      setCsvHeaders(headers);
      setColumnMapping(detected);
      setUploadState("mapping");
    } catch {
      setUploadState("error");
      setMessage("Could not read CSV headers.");
      setTimeout(() => { setUploadState("idle"); setMessage(null); }, 3000);
    }
  };

  const handleMappingConfirm = async (mapping: ColumnMapping) => {
    setUploadState("processing");
    setMessage("Parsing rows…");
    setFileProgress(null);

    try {
      const rules = await getCategoryRules();
      const allRows: PreviewRow[] = [];
      let idCounter = 0;

      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        if (pendingFiles.length > 1) {
          setFileProgress(`Parsing file ${i + 1} of ${pendingFiles.length}: ${file.name}`);
        }
        const rows = await extractPreviewRows(file, rules, mapping, idCounter);
        idCounter += rows.length;
        allRows.push(...rows);
      }

      setPreviewRows(allRows);
      setColumnMapping(mapping);
      setUploadState("preview");
      setMessage(null);
      setFileProgress(null);
    } catch (err: unknown) {
      setUploadState("error");
      setMessage(err instanceof Error ? err.message : "Failed to parse CSV.");
      setTimeout(() => { setUploadState("idle"); setMessage(null); }, 3000);
    }
  };

  const handlePreviewConfirm = async (finalRows: PreviewRow[]) => {
    setUploadState("processing");
    setMessage("Importing transactions…");
    setFileProgress(null);
    setSkippedWarning(null);

    try {
      const count = await importValidRows(finalRows);
      const skipped = finalRows.filter((r) => r.isSkipped || Object.keys(r.errors).length > 0).length;
      const rejected = pendingRejected;

      setPendingFiles([]);
      setPendingRejected([]);
      setPreviewRows([]);

      setUploadState("success");
      setMessage(
        skipped > 0
          ? `Imported ${count} transaction${count !== 1 ? "s" : ""}. ${skipped} row${skipped !== 1 ? "s" : ""} skipped.`
          : `Successfully imported ${count} transaction${count !== 1 ? "s" : ""}.`,
      );

      if (rejected.length > 0) {
        const names = rejected.join(", ");
        setSkippedWarning(
          `${rejected.length} file${rejected.length > 1 ? "s" : ""} skipped (not a CSV): ${names}`,
        );
      }

      setTimeout(() => {
        setUploadState("idle");
        setMessage(null);
        setFileProgress(null);
        setSkippedWarning(null);
      }, 4000);
    } catch (err: unknown) {
      setUploadState("error");
      setMessage(err instanceof Error ? err.message : "Import failed.");
      setTimeout(() => { setUploadState("idle"); setMessage(null); }, 3000);
    }
  };

  const handleMappingCancel = () => {
    setPendingFiles([]);
    setPendingRejected([]);
    setCsvHeaders([]);
    setColumnMapping(null);
    setPreviewRows([]);
    setUploadState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState === "processing") return;
    processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  if (uploadState === "mapping" && columnMapping) {
    return (
      <CsvColumnMapper
        filename={pendingFiles[0]?.name ?? ""}
        csvHeaders={csvHeaders}
        initialMapping={columnMapping}
        onConfirm={handleMappingConfirm}
        onCancel={handleMappingCancel}
      />
    );
  }

  if (uploadState === "preview") {
    return (
      <CsvImportPreview
        rows={previewRows}
        filename={pendingFiles[0]?.name ?? ""}
        onConfirmImport={handlePreviewConfirm}
        onCancel={() => setUploadState("mapping")}
        onChange={setPreviewRows}
      />
    );
  }

  const borderClass = {
    idle: "border-border hover:border-primary/50 hover:bg-accent",
    dragging: "border-primary bg-primary/10 scale-[1.02]",
    processing: "border-info bg-info/5 cursor-wait",
    mapping: "border-border",
    preview: "border-border",
    success: "border-success bg-success/10",
    error: "border-destructive bg-destructive/10",
  }[uploadState];

  const iconClass = {
    idle: "text-muted-foreground",
    dragging: "text-primary",
    processing: "text-info animate-spin",
    mapping: "text-muted-foreground",
    preview: "text-muted-foreground",
    success: "text-success",
    error: "text-destructive",
  }[uploadState];

  const Icon =
    uploadState === "processing"
      ? Loader2
      : uploadState === "success"
        ? CheckCircle
        : uploadState === "error"
          ? AlertCircle
          : UploadCloud;

  const label = {
    idle: "Drag & drop your bank CSV files",
    dragging: "Drop them here!",
    processing: "Processing Data...",
    mapping: "Mapping columns…",
    preview: "Reviewing import…",
    success: "Import Complete",
    error: "Import Failed",
  }[uploadState];

  const messageColorClass =
    uploadState === "error"
      ? "text-destructive"
      : uploadState === "success"
        ? "text-success"
        : "text-muted-foreground";

  return (
    <div className="w-full">
      <input
        type="file"
        accept=".csv"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      <div
        onClick={() =>
          uploadState !== "processing" && fileInputRef.current?.click()
        }
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${borderClass}`}
      >
        <Icon className={`w-6 h-6 mb-1 transition-colors ${iconClass}`} />

        <p className="text-sm font-medium text-foreground text-center">
          {label}
        </p>

        {message ? (
          <p
            className={`text-xs mt-2 text-center max-w-xs truncate ${messageColorClass}`}
          >
            {message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse — select multiple files at once
          </p>
        )}

        {fileProgress && (
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {fileProgress}
          </p>
        )}

        {skippedWarning && (
          <p className="text-xs text-amber-500 mt-1 text-center max-w-xs truncate">
            {skippedWarning}
          </p>
        )}
      </div>
    </div>
  );
}
