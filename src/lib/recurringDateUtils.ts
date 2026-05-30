import type { RecurringTransactionInput } from "@/lib/validations/recurring";

type FrequencyOpts = {
  dayOfMonth?: number;
  dayOfWeek?: number;
  monthOfYear?: number;
  dayOfYear?: number;
};

export function lastDayOf(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function setDayOfMonthClamped(d: Date, day: number): void {
  const max = lastDayOf(d.getFullYear(), d.getMonth());
  d.setDate(Math.min(day, max));
}

export function nextWeekday(from: Date, targetDow: number): Date {
  const d = new Date(from);
  const diff = (targetDow - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export function computeNextRunDate(
  frequency: RecurringTransactionInput["frequency"],
  opts: FrequencyOpts,
  from?: Date,
): string {
  const base = from ?? new Date();
  const d = new Date(base);

  switch (frequency) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      break;
    case "WEEKLY":
      if (opts.dayOfWeek !== undefined) {
        const next = nextWeekday(d, opts.dayOfWeek);
        return next.toISOString().split("T")[0];
      }
      d.setDate(d.getDate() + 7);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      if (opts.dayOfMonth) setDayOfMonthClamped(d, opts.dayOfMonth);
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      if (opts.monthOfYear) {
        d.setMonth(opts.monthOfYear - 1);
        setDayOfMonthClamped(d, opts.dayOfYear ?? d.getDate());
      }
      break;
  }

  return d.toISOString().split("T")[0];
}

export function initialNextRunDate(
  frequency: RecurringTransactionInput["frequency"],
  opts: FrequencyOpts,
  today?: Date,
): string {
  const base = today ?? new Date();

  if (frequency === "MONTHLY" && opts.dayOfMonth) {
    const target = new Date(base.getFullYear(), base.getMonth(), 1);
    setDayOfMonthClamped(target, opts.dayOfMonth);
    if (target <= base) target.setMonth(target.getMonth() + 1);
    setDayOfMonthClamped(target, opts.dayOfMonth);
    return target.toISOString().split("T")[0];
  }

  if (frequency === "WEEKLY" && opts.dayOfWeek !== undefined) {
    return nextWeekday(base, opts.dayOfWeek).toISOString().split("T")[0];
  }

  if (frequency === "YEARLY" && opts.monthOfYear) {
    const target = new Date(base.getFullYear(), opts.monthOfYear - 1, 1);
    setDayOfMonthClamped(target, opts.dayOfYear ?? 1);
    if (target <= base) {
      target.setFullYear(target.getFullYear() + 1);
      target.setMonth(opts.monthOfYear - 1);
      setDayOfMonthClamped(target, opts.dayOfYear ?? 1);
    }
    return target.toISOString().split("T")[0];
  }

  return computeNextRunDate(frequency, opts, base);
}
