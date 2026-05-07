"use client";

import { useState, DragEvent, useRef } from "react";
import Papa from "papaparse";
import { UploadCloud, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { batchCreateTransactions } from "@/app/actions/transactions";

type UploadState = "idle" | "dragging" | "processing" | "success" | "error";

export default function CsvUploader() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState !== "processing") setUploadState("dragging");
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState !== "processing") setUploadState("idle");
  };

  const processFile = (file: File) => {
    if (!file) return;
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setUploadState("error");
      setMessage("Invalid file format. Please upload a .csv file.");
      return;
    }

    setUploadState("processing");
    setMessage(`Parsing ${file.name}...`);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setMessage(
          `Found ${results.data.length} rows. Uploading to database...`,
        );

        // Auto-Mapper: Normalize messy bank CSV headers to match our schema
        const mappedTransactions = results.data
          .map((row: any) => {
            const normalizedRow: Record<string, string> = {};
            for (const key in row) {
              normalizedRow[key.toLowerCase().trim()] = row[key];
            }

            return {
              description:
                normalizedRow.description ||
                normalizedRow.name ||
                normalizedRow.memo ||
                "Imported Transaction",
              // Strip out '$' or commas before parsing the number
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
              category:
                normalizedRow.category || normalizedRow.type || "Uncategorized",
            };
          })
          .filter((tx) => tx.amount !== 0); // Drop empty rows

        // Send to our Server Action
        const result = await batchCreateTransactions(mappedTransactions);

        if (result.error) {
          setUploadState("error");
          setMessage(result.error);
        } else {
          setUploadState("success");
          setMessage(`Successfully imported ${result.count} transactions.`);
          // Reset after 3 seconds
          setTimeout(() => {
            setUploadState("idle");
            setMessage(null);
          }, 3000);
        }
      },
      error: (error) => {
        setUploadState("error");
        setMessage(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState === "processing") return;
    processFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
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
    idle: "Drag & drop your bank CSV",
    dragging: "Drop it here!",
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
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${borderClass}`}
      >
        <Icon className={`w-10 h-10 mb-3 transition-colors ${iconClass}`} />

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
            or click to browse files
          </p>
        )}
      </div>
    </div>
  );
}
