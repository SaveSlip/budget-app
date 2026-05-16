"use client";

import { useState, DragEvent, useRef } from "react";
import Papa from "papaparse";
import { UploadCloud, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { batchCreateTransactions } from "@/app/actions/transactions";
import { UNIVERSAL_INCOME_CATEGORIES } from "@/lib/constants/categories";

const INCOME_TYPE_KEYWORDS = ["income", "credit", "deposit", "revenue", "inflow"];

function detectTransactionType(
  rawType: string,
  description: string,
): "INCOME" | "EXPENSE" {
  const typeVal = rawType.toLowerCase().trim();
  if (INCOME_TYPE_KEYWORDS.some((kw) => typeVal.includes(kw))) return "INCOME";

  const desc = description.toLowerCase();
  for (const cat of UNIVERSAL_INCOME_CATEGORIES) {
    if (cat.keywords.some((kw) => desc.includes(kw))) return "INCOME";
  }

  return "EXPENSE";
}

function filterCsvFiles(files: FileList | File[]): { valid: File[]; rejected: string[] } {
  const arr = Array.from(files);
  const valid = arr.filter((f) => f.type === "text/csv" || f.name.endsWith(".csv"));
  const rejected = arr
    .filter((f) => f.type !== "text/csv" && !f.name.endsWith(".csv"))
    .map((f) => f.name);
  return { valid, rejected };
}

type UploadState = "idle" | "dragging" | "processing" | "success" | "error";

export default function CsvUploader() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [fileProgress, setFileProgress] = useState<string | null>(null);
  const [skippedWarning, setSkippedWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState !== "processing") setUploadState("dragging");
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState !== "processing") setUploadState("idle");
  };

  // Returns count of imported transactions or throws
  const parseSingleFile = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const mappedTransactions = results.data
            .map((row: any) => {
              const normalizedRow: Record<string, string> = {};
              for (const key in row) {
                normalizedRow[key.toLowerCase().trim()] = row[key];
              }

              const description =
                normalizedRow.description ||
                normalizedRow.name ||
                normalizedRow.memo ||
                "Imported Transaction";
              const rawType =
                normalizedRow.type ||
                normalizedRow["transaction type"] ||
                normalizedRow["transaction_type"] ||
                "";

              return {
                description,
                amount: Number(
                  (normalizedRow.amount || normalizedRow.value || "0").replace(
                    /[^0-9.-]+/g,
                    "",
                  ),
                ),
                date:
                  normalizedRow.date ||
                  normalizedRow["transaction date"] ||
                  new Date().toISOString().split("T")[0],
                category: normalizedRow.category || rawType || "Uncategorized",
                transactionType: detectTransactionType(rawType, description),
              };
            })
            .filter((tx) => tx.amount !== 0);

          const result = await batchCreateTransactions(mappedTransactions);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result.count ?? 0);
          }
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        },
      });
    });
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

    setUploadState("processing");
    setSkippedWarning(null);
    setFileProgress(null);

    let totalImported = 0;
    const errors: string[] = [];

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      setFileProgress(
        valid.length > 1 ? `File ${i + 1} of ${valid.length}: ${file.name}` : null,
      );
      setMessage(`Parsing ${file.name}...`);

      try {
        const count = await parseSingleFile(file);
        totalImported += count;
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    if (errors.length > 0 && totalImported === 0) {
      setUploadState("error");
      setMessage(errors[0]);
    } else {
      setUploadState("success");
      const fileLabel = valid.length > 1 ? `${valid.length} files` : valid[0].name;
      setMessage(`Successfully imported ${totalImported} transactions from ${fileLabel}.`);

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
    }

    setFileProgress(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState === "processing") return;
    processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset so the same files can be re-selected if needed
      e.target.value = "";
    }
  };

  const borderClass = {
    idle: "border-border hover:border-primary/50 hover:bg-accent",
    dragging: "border-primary bg-primary/10 scale-[1.02]",
    processing: "border-info bg-info/5 cursor-wait",
    success: "border-success bg-success/10",
    error: "border-destructive bg-destructive/10",
  }[uploadState];

  const iconClass = {
    idle: "text-muted-foreground",
    dragging: "text-primary",
    processing: "text-info animate-spin",
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
