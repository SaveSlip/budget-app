"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subMonths } from "date-fns";

export function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Generate the last 12 months for the dropdown
  const months = Array.from({ length: 12 }).map((_, i) => {
    const date = subMonths(new Date(), i);
    return {
      label: format(date, "MMMM yyyy"),
      value: format(date, "yyyy-MM"),
    };
  });

  const currentMonth =
    searchParams.get("month") || format(new Date(), "yyyy-MM");
  const currentQuery = searchParams.get("q") || "";

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
      <div className="w-full md:w-72">
        <Input
          placeholder="Search merchants..."
          defaultValue={currentQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilters({ q: (e.target as HTMLInputElement).value });
            }
          }}
          onBlur={(e) => updateFilters({ q: e.target.value })}
          className="bg-background/50 border-border text-foreground"
        />
      </div>

      <div className="w-full md:w-48">
        <Select
          value={currentMonth}
          onValueChange={(val) => updateFilters({ month: val })}
        >
          <SelectTrigger className="bg-background/50 border-border text-foreground">
            <SelectValue placeholder="Select Month" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending && (
        <span className="text-xs text-primary animate-pulse font-mono uppercase">
          Syncing...
        </span>
      )}
    </div>
  );
}
