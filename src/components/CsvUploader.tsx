"use client";

import { useState, useEffect, DragEvent, useRef } from "react";
import Papa from "papaparse";
import { UploadCloud, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { batchCreateTransactions, checkDuplicates } from "@/app/actions/transactions";
import { getCategoryRules, type CategoryRule } from "@/app/actions/categoryRules";
import { applyUserRules, autoMatchCategory, UNIVERSAL_CATEGORIES, UNIVERSAL_INCOME_CATEGORIES } from "@/lib/constants/categories";
import { CsvColumnMapper, autoDetectMapping, type ColumnMapping } from "@/components/CsvColumnMapper";
import {
  CsvImportPreview,
  validatePreviewRow,
  type PreviewRow,
} from "@/components/CsvImportPreview";
import { CsvAccountSelector } from "@/components/CsvAccountSelector";
import { CsvFormatOptions } from "@/components/CsvFormatOptions";
import { detectAccountNumberFromCsv, matchAccountByNumber } from "@/lib/accountMatching";
import {
  parseDate,
  parseAmount,
  type FormatOptions,
} from "@/lib/csvFormatUtils";
import { sendImportSuccessEmail, sendImportFailureEmail } from "@/app/actions/importEmail";
import type { Account, Category } from "@/lib/data/budget";

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

function collectSampleDates(file: File, dateHeader: string, n = 10): Promise<string[]> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      preview: n,
      skipEmptyLines: true,
      complete: (results) => {
        const key = dateHeader.toLowerCase().trim();
        const dates = (results.data as Record<string, string>[])
          .map((row) => row[key]?.trim() ?? "")
          .filter(Boolean);
        resolve(dates);
      },
      error: () => resolve([]),
    });
  });
}

function extractPreviewRows(
  file: File,
  rules: CategoryRule[],
  mapping: ColumnMapping,
  idOffset: number,
  formatOptions: FormatOptions,
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

          const typeColValue =
            mapping.type !== "auto"
              ? normalizedRow[mapping.type.toLowerCase().trim()]
              : undefined;

          const { amount: amountStr, transactionType } = parseAmount(
            normalizedRow[amtKey] || "0",
            formatOptions.amountConvention,
            typeColValue,
          );

          const date = parseDate(normalizedRow[dateKey] || "", formatOptions.dateFormat);

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
            isDuplicate: false,
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

async function importValidRows(rows: PreviewRow[], accountId: string | null): Promise<number> {
  const toImport = rows.filter(
    (r) => !r.isSkipped && !r.isDuplicate && Object.keys(r.errors).length === 0,
  );
  if (toImport.length === 0) return 0;

  const transactions = toImport.map((r) => ({
    description: r.description,
    amount: Number(r.amount),
    date: r.date,
    category: r.category,
    transactionType: r.transactionType,
    ...(accountId ? { accountId } : {}),
  }));

  const result = await batchCreateTransactions(transactions);
  if (result.error) throw new Error(result.error);
  return result.count ?? 0;
}

type UploadState =
  | "idle"
  | "dragging"
  | "processing"
  | "account-select"
  | "mapping"
  | "format-options"
  | "preview"
  | "success"
  | "error";

const ACTIVE_STATES = new Set<UploadState>([
  "dragging",
  "processing",
  "account-select",
  "mapping",
  "format-options",
  "preview",
]);

interface CsvUploaderProps {
  onActiveChange?: (active: boolean) => void;
  onImportComplete?: (month: string) => void;
  glowing?: boolean;
  tall?: boolean;
  accounts?: Account[];
  categories?: Category[];
}

const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  dateFormat: "MM/DD/YYYY",
  amountConvention: "negative-expense",
};

export default function CsvUploader({
  onActiveChange,
  onImportComplete,
  glowing,
  tall,
  accounts = [],
  categories = [],
}: CsvUploaderProps = {}) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  useEffect(() => {
    onActiveChange?.(ACTIVE_STATES.has(uploadState));
  }, [uploadState, onActiveChange]);
  const [message, setMessage] = useState<string | null>(null);
  const [fileProgress, setFileProgress] = useState<string | null>(null);
  const [skippedWarning, setSkippedWarning] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingRejected, setPendingRejected] = useState<string[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [formatOptions, setFormatOptions] = useState<FormatOptions>(DEFAULT_FORMAT_OPTIONS);
  const [sampleDates, setSampleDates] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [detectedAccountNumber, setDetectedAccountNumber] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // All category names available for the preview dropdown (universal + user-defined)
  const allCategoryNames = Array.from(
    new Set([
      ...UNIVERSAL_CATEGORIES.map((c) => c.name),
      ...UNIVERSAL_INCOME_CATEGORIES.map((c) => c.name),
      ...categories.map((c) => c.name),
    ]),
  );

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

      // Peek at first data row to detect an account number column
      const firstRowDetection = await new Promise<{ columnName: string; value: string } | null>((resolve) => {
        Papa.parse(valid[0], {
          header: true,
          preview: 1,
          skipEmptyLines: true,
          complete: (results) => {
            const firstRow = (results.data[0] ?? {}) as Record<string, string>;
            resolve(detectAccountNumberFromCsv(headers, firstRow));
          },
          error: () => resolve(null),
        });
      });

      setPendingFiles(valid);
      setPendingRejected(rejected);
      setCsvHeaders(headers);
      setColumnMapping(detected);

      const detectedNum = firstRowDetection?.value ?? null;
      setDetectedAccountNumber(detectedNum);

      // Pre-select account if number matches an existing one
      const matched = detectedNum ? matchAccountByNumber(detectedNum, accounts) : null;
      setSelectedAccountId(matched?.id ?? null);

      setUploadState("account-select");
    } catch {
      setUploadState("error");
      setMessage("Could not read CSV headers.");
      setTimeout(() => { setUploadState("idle"); setMessage(null); }, 3000);
    }
  };

  const runParseAndPreview = async (mapping: ColumnMapping, options: FormatOptions) => {
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
        const rows = await extractPreviewRows(file, rules, mapping, idCounter, options);
        idCounter += rows.length;
        allRows.push(...rows);
      }

      // Check for duplicates against existing DynamoDB records
      setMessage("Checking for duplicates…");
      const dupResult = await checkDuplicates(
        allRows.map((r) => ({
          rowId: r.id,
          date: r.date,
          amount: Number(r.amount),
          description: r.description,
        })),
      );
      const dupSet = new Set(dupResult.duplicateRowIds ?? []);
      const rowsWithDups = allRows.map((r) =>
        dupSet.has(r.id) ? { ...r, isDuplicate: true } : r,
      );

      setPreviewRows(rowsWithDups);
      setUploadState("preview");
      setMessage(null);
      setFileProgress(null);
    } catch (err: unknown) {
      setUploadState("error");
      setMessage(err instanceof Error ? err.message : "Failed to parse CSV.");
      setTimeout(() => { setUploadState("idle"); setMessage(null); }, 3000);
    }
  };

  const handleMappingConfirm = async (mapping: ColumnMapping) => {
    setColumnMapping(mapping);
    const samples = await collectSampleDates(pendingFiles[0], mapping.date);
    setSampleDates(samples);
    const defaultOptions: FormatOptions = {
      dateFormat: "MM/DD/YYYY",
      amountConvention: mapping.type !== "auto" ? "type-column" : "negative-expense",
    };
    setFormatOptions(defaultOptions);
    setUploadState("format-options");
  };

  const handleFormatConfirm = async (options: FormatOptions) => {
    setFormatOptions(options);
    await runParseAndPreview(columnMapping!, options);
  };

  const handlePreviewConfirm = async (finalRows: PreviewRow[]) => {
    setUploadState("processing");
    setMessage("Importing transactions…");
    setFileProgress(null);
    setSkippedWarning(null);

    try {
      const count = await importValidRows(finalRows, selectedAccountId);
      const skipped = finalRows.filter((r) => r.isSkipped || Object.keys(r.errors).length > 0).length;
      const rejected = pendingRejected;

      // Derive the earliest month from successfully imported rows and notify parent
      const importedMonths = finalRows
        .filter((r) => !r.isSkipped && Object.keys(r.errors).length === 0)
        .map((r) => r.date.slice(0, 7))
        .filter(Boolean)
        .sort();
      if (importedMonths.length > 0) onImportComplete?.(importedMonths[importedMonths.length - 1]);

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

      // Fire-and-forget — email result must not block or affect import outcome
      sendImportSuccessEmail(count).catch(() => {});

      setTimeout(() => {
        setUploadState("idle");
        setMessage(null);
        setFileProgress(null);
        setSkippedWarning(null);
      }, 4000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Import failed.";
      setUploadState("error");
      setMessage(errorMsg);
      sendImportFailureEmail(errorMsg).catch(() => {});
      setTimeout(() => { setUploadState("idle"); setMessage(null); }, 3000);
    }
  };

  const handleMappingCancel = () => {
    setPendingFiles([]);
    setPendingRejected([]);
    setCsvHeaders([]);
    setColumnMapping(null);
    setFormatOptions(DEFAULT_FORMAT_OPTIONS);
    setSampleDates([]);
    setPreviewRows([]);
    setDetectedAccountNumber(null);
    setSelectedAccountId(null);
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

  if (uploadState === "account-select" && columnMapping) {
    return (
      <CsvAccountSelector
        accounts={accounts}
        detectedAccountNumber={detectedAccountNumber}
        preSelectedAccountId={selectedAccountId}
        filename={pendingFiles[0]?.name ?? ""}
        onSelect={(accountId) => {
          setSelectedAccountId(accountId);
          setUploadState("mapping");
        }}
        onBack={handleMappingCancel}
      />
    );
  }

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

  if (uploadState === "format-options" && columnMapping) {
    return (
      <CsvFormatOptions
        filename={pendingFiles[0]?.name ?? ""}
        sampleDates={sampleDates}
        hasTypeColumn={columnMapping.type !== "auto"}
        initialOptions={formatOptions}
        onConfirm={handleFormatConfirm}
        onBack={() => setUploadState("mapping")}
      />
    );
  }

  if (uploadState === "preview") {
    return (
      <CsvImportPreview
        rows={previewRows}
        filename={pendingFiles[0]?.name ?? ""}
        onConfirmImport={handlePreviewConfirm}
        onCancel={() => setUploadState("format-options")}
        onChange={setPreviewRows}
        categories={allCategoryNames}
      />
    );
  }

  const borderClass = {
    idle: "border-border hover:border-primary/50 hover:bg-accent",
    dragging: "border-primary bg-primary/10 scale-[1.02]",
    processing: "border-info bg-info/5 cursor-wait",
    "account-select": "border-border",
    mapping: "border-border",
    "format-options": "border-border",
    preview: "border-border",
    success: "border-success bg-success/10",
    error: "border-destructive bg-destructive/10",
  }[uploadState];

  const iconClass = {
    idle: "text-muted-foreground",
    dragging: "text-primary",
    processing: "text-info animate-spin",
    "account-select": "text-muted-foreground",
    mapping: "text-muted-foreground",
    "format-options": "text-muted-foreground",
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
    "account-select": "Selecting account…",
    mapping: "Mapping columns…",
    "format-options": "Confirming format…",
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
    <div className={`w-full ${tall ? "flex-1 flex flex-col" : ""}`}>
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
        className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer ${borderClass} ${
          glowing && uploadState === "idle"
            ? "ring-2 ring-primary/40 shadow-[0_0_18px_3px_hsl(var(--primary)/0.20)]"
            : "ring-0 shadow-none"
        } ${tall ? "flex-1" : "min-h-20"}`}
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
          <p className="text-xs text-warning mt-1 text-center max-w-xs truncate">
            {skippedWarning}
          </p>
        )}
      </div>
    </div>
  );
}
