"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subMonths } from "date-fns";
import { X } from "lucide-react";

function setStoredFilter(val: { month: string; year: string; view: string }) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem("budgify-filter", JSON.stringify(val)); } catch {}
}

function getStoredFilter(): { month: string; year: string; view: string } | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(sessionStorage.getItem("budgify-filter") ?? "null"); } catch { return null; }
}

export function DashboardFilters({ availableMonths: propMonths }: { availableMonths?: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const months = (propMonths ?? Array.from({ length: 12 }, (_, i) => format(subMonths(new Date(), i), "yyyy-MM")))
    .map((value) => ({
      label: format(new Date(value + "-02"), "MMMM yyyy"),
      value,
    }));

  const view = searchParams.get("view") === "yearly" ? "yearly" : "monthly";
  const currentYear = format(new Date(), "yyyy");
  const activeYear = searchParams.get("year") || currentYear;
  const years = [0, 1, 2, 3].map((i) => String(Number(currentYear) - i));

  const currentMonth =
    searchParams.get("month") || format(new Date(), "yyyy-MM");
  const currentQuery = searchParams.get("q") || "";

  const prevMonth = useRef(currentMonth);
  const [highlighted, setHighlighted] = useState(false);
  const [inputValue, setInputValue] = useState(currentQuery);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (prevMonth.current !== currentMonth) {
      prevMonth.current = currentMonth;
      setHighlighted(true);
      const t = setTimeout(() => setHighlighted(false), 900);
      return () => clearTimeout(t);
    }
  }, [currentMonth]);

  // On first arrival at /dashboard with no filter params, restore last session filter from sessionStorage
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;
    const hasParams = searchParams.get("month") || searchParams.get("year") || searchParams.get("view");
    if (hasParams) return;
    const stored = getStoredFilter();
    if (!stored) return;
    const params = new URLSearchParams();
    if (stored.view === "yearly") {
      params.set("view", "yearly");
      if (stored.year && stored.year !== format(new Date(), "yyyy")) params.set("year", stored.year);
    } else if (stored.month && stored.month !== format(new Date(), "yyyy-MM")) {
      params.set("month", stored.month);
    }
    if (params.toString()) router.replace(`/dashboard?${params.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep sessionStorage in sync with the current dashboard filter
  useEffect(() => {
    setStoredFilter({ month: currentMonth, year: activeYear, view });
  }, [currentMonth, activeYear, view]);

  // Scroll to results when a search query is active
  useEffect(() => {
    if (!currentQuery) return;
    document.getElementById("recent-transactions")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentQuery]);

function updateFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

    startTransition(() => {
      router.push(`/dashboard?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 w-full bg-muted/50 p-4 rounded-xl border border-border backdrop-blur-md">
      <div className="relative w-full md:flex-1">
        <Input
          placeholder="Search merchants..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilters({ q: (e.target as HTMLInputElement).value });
            }
          }}
          onBlur={(e) => updateFilters({ q: e.target.value })}
          className={`bg-background/50 border-border text-foreground${inputValue ? " pr-8" : ""}`}
        />
        {inputValue && (
          <button
            onClick={() => {
              setInputValue("")
              updateFilters({ q: "" })
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="shrink-0">
        {view === "monthly" ? (
          <Select
            value={currentMonth}
            onValueChange={(val) => updateFilters({ month: val })}
          >
            <SelectTrigger
              className={`w-56 bg-background/70 border-2 border-border text-foreground font-semibold text-base tracking-wide transition-all duration-300 ${
                highlighted ? "shadow-[0_0_12px_3px_rgba(255,255,255,0.25)] border-white/40" : ""
              }`}
            >
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-popover border-border text-popover-foreground">
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
              <SelectItem value="all">All months</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={activeYear}
            onValueChange={(val) => updateFilters({ year: val })}
          >
            <SelectTrigger className="w-56 bg-background/70 border-2 border-border text-foreground font-semibold text-base tracking-wide">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-popover border-border text-popover-foreground">
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
              <SelectItem value="all">All years</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="md:flex-1 flex justify-end items-center gap-3">
        {isPending && (
          <span className="text-xs text-primary animate-pulse font-mono uppercase">
            Syncing...
          </span>
        )}
        <div className="flex items-center gap-1.5 text-sm font-semibold tracking-wide uppercase">
          <button
            onClick={() => view !== "monthly" && updateFilters({ view: "", year: "", month: format(new Date(), "yyyy-MM") })}
            className={`transition-colors focus-visible:outline-none ${view === "monthly" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Monthly
          </button>
          <span className="text-muted-foreground">/</span>
          <button
            onClick={() => view !== "yearly" && updateFilters({ view: "yearly", month: "", year: activeYear })}
            className={`transition-colors focus-visible:outline-none ${view === "yearly" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Yearly
          </button>
        </div>
      </div>
    </div>
  );
}
