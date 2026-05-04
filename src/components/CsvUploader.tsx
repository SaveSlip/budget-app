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
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
          ${uploadState === "idle" ? "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""}
          ${uploadState === "dragging" ? "border-orange-500 bg-orange-500/10 scale-[1.02]" : ""}
          ${uploadState === "processing" ? "border-blue-500 bg-blue-500/5 cursor-wait" : ""}
          ${uploadState === "success" ? "border-green-500 bg-green-500/10" : ""}
          ${uploadState === "error" ? "border-red-500 bg-red-500/10" : ""}
        `}
      >
        {uploadState === "idle" || uploadState === "dragging" ? (
          <UploadCloud
            className={`w-10 h-10 mb-3 transition-colors ${uploadState === "dragging" ? "text-orange-500" : "text-gray-400"}`}
          />
        ) : uploadState === "processing" ? (
          <Loader2 className="w-10 h-10 mb-3 text-blue-500 animate-spin" />
        ) : uploadState === "success" ? (
          <CheckCircle className="w-10 h-10 mb-3 text-green-500" />
        ) : (
          <AlertCircle className="w-10 h-10 mb-3 text-red-500" />
        )}

        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
          {uploadState === "dragging"
            ? "Drop it here!"
            : uploadState === "processing"
              ? "Processing Data..."
              : uploadState === "success"
                ? "Upload Complete"
                : uploadState === "error"
                  ? "Upload Failed"
                  : "Drag & drop your bank CSV"}
        </p>

        {message ? (
          <p
            className={`text-xs mt-2 text-center max-w-62.5 truncate ${
              uploadState === "error"
                ? "text-red-600 dark:text-red-400"
                : uploadState === "success"
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500"
            }`}
          >
            {message}
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            or click to browse files
          </p>
        )}
      </div>
    </div>
  );
}
