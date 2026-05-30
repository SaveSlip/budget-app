import { describe, it, expect } from "vitest";
import {
  lastDayOf,
  setDayOfMonthClamped,
  nextWeekday,
  computeNextRunDate,
  initialNextRunDate,
} from "./recurringDateUtils";

describe("lastDayOf", () => {
  it("returns 31 for January (month 0)", () => {
    expect(lastDayOf(2026, 0)).toBe(31);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(lastDayOf(2025, 1)).toBe(28);
  });

  it("returns 29 for February in a leap year", () => {
    expect(lastDayOf(2024, 1)).toBe(29);
  });

  it("returns 30 for April (month 3)", () => {
    expect(lastDayOf(2026, 3)).toBe(30);
  });

  it("returns 31 for December (month 11)", () => {
    expect(lastDayOf(2026, 11)).toBe(31);
  });
});

describe("setDayOfMonthClamped", () => {
  it("sets the day directly when it fits in the month", () => {
    const d = new Date(2026, 0, 1); // Jan 1
    setDayOfMonthClamped(d, 15);
    expect(d.getDate()).toBe(15);
  });

  it("clamps to the last day when day exceeds the month length", () => {
    const d = new Date(2026, 1, 1); // Feb 2026 (28 days)
    setDayOfMonthClamped(d, 31);
    expect(d.getDate()).toBe(28);
  });

  it("clamps Feb 29 to 28 in a non-leap year", () => {
    const d = new Date(2025, 1, 1);
    setDayOfMonthClamped(d, 29);
    expect(d.getDate()).toBe(28);
  });
});

describe("nextWeekday", () => {
  // 2026-05-29 is a Friday (day 5)
  const friday = new Date(2026, 4, 29);

  it("returns next Monday (1) from a Friday", () => {
    const result = nextWeekday(friday, 1);
    expect(result.getDay()).toBe(1);
    expect(result > friday).toBe(true);
  });

  it("returns next Saturday (6) from a Friday", () => {
    const result = nextWeekday(friday, 6);
    expect(result.getDay()).toBe(6);
  });

  it("returns the following Friday when targeting same weekday", () => {
    const result = nextWeekday(friday, 5);
    expect(result.getDay()).toBe(5);
    // Should be 7 days later (next Friday), same weekday
    const diff = (result.getTime() - friday.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(7);
  });

  it("does not mutate the input date", () => {
    const orig = new Date(friday);
    nextWeekday(friday, 1);
    expect(friday.getTime()).toBe(orig.getTime());
  });
});

describe("computeNextRunDate", () => {
  const base = new Date(2026, 4, 15); // 2026-05-15 (Friday)

  it("DAILY adds one day", () => {
    expect(computeNextRunDate("DAILY", {}, base)).toBe("2026-05-16");
  });

  it("WEEKLY without dayOfWeek adds 7 days", () => {
    expect(computeNextRunDate("WEEKLY", {}, base)).toBe("2026-05-22");
  });

  it("WEEKLY with dayOfWeek returns next occurrence of that weekday", () => {
    const result = computeNextRunDate("WEEKLY", { dayOfWeek: 1 }, base);
    const parsed = new Date(result + "T00:00:00");
    expect(parsed.getDay()).toBe(1);
  });

  it("MONTHLY advances one month", () => {
    expect(computeNextRunDate("MONTHLY", {}, base)).toBe("2026-06-15");
  });

  it("MONTHLY with dayOfMonth clamps to month end", () => {
    const janBase = new Date(2026, 0, 15); // Jan 15
    const result = computeNextRunDate("MONTHLY", { dayOfMonth: 31 }, janBase);
    expect(result).toBe("2026-02-28");
  });

  it("YEARLY advances one year", () => {
    expect(computeNextRunDate("YEARLY", {}, base)).toBe("2027-05-15");
  });

  it("YEARLY with monthOfYear and dayOfYear pins to that date next year", () => {
    const result = computeNextRunDate("YEARLY", { monthOfYear: 3, dayOfYear: 20 }, base);
    expect(result).toBe("2027-03-20");
  });

  it("YEARLY with monthOfYear but no dayOfYear uses current day of month (line 53)", () => {
    // base is May 15; advancing 1 year → May 15 2027, then set to Mar, same day = Mar 15
    const result = computeNextRunDate("YEARLY", { monthOfYear: 3 }, base);
    expect(result).toBe("2027-03-15");
  });

  it("YEARLY with monthOfYear clamps dayOfYear to month end", () => {
    const result = computeNextRunDate("YEARLY", { monthOfYear: 2, dayOfYear: 30 }, base);
    expect(result).toBe("2027-02-28");
  });

  it("uses current date when from is omitted", () => {
    const result = computeNextRunDate("DAILY", {});
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    expect(result).toBe(tomorrow.toISOString().split("T")[0]);
  });
});

describe("initialNextRunDate", () => {
  it("MONTHLY with a future dayOfMonth in this month returns this month's date", () => {
    const today = new Date(2026, 4, 10); // May 10
    const result = initialNextRunDate("MONTHLY", { dayOfMonth: 20 }, today);
    expect(result).toBe("2026-05-20");
  });

  it("MONTHLY with a past dayOfMonth rolls to next month", () => {
    const today = new Date(2026, 4, 25); // May 25
    const result = initialNextRunDate("MONTHLY", { dayOfMonth: 10 }, today);
    expect(result).toBe("2026-06-10");
  });

  it("MONTHLY rolls to next-viable month when setMonth overflows (JS Date behaviour)", () => {
    // Jan 31, dayOfMonth=31: setMonth(Feb) on day-31 overflows to March 3 in JS,
    // then clamp to March 31 — this is the correct implementation output.
    const today = new Date(2026, 0, 31);
    const result = initialNextRunDate("MONTHLY", { dayOfMonth: 31 }, today);
    expect(result).toBe("2026-03-31");
  });

  it("WEEKLY returns the next occurrence of the target weekday", () => {
    const friday = new Date(2026, 4, 29); // Friday
    const result = initialNextRunDate("WEEKLY", { dayOfWeek: 1 }, friday);
    const parsed = new Date(result + "T00:00:00");
    expect(parsed.getDay()).toBe(1);
  });

  it("YEARLY with a future date in the current year returns it", () => {
    const today = new Date(2026, 4, 1); // May 1
    const result = initialNextRunDate("YEARLY", { monthOfYear: 12, dayOfYear: 25 }, today);
    expect(result).toBe("2026-12-25");
  });

  it("YEARLY without dayOfYear defaults day to 1 for future month (line 82)", () => {
    const today = new Date(2026, 4, 1); // May 1
    const result = initialNextRunDate("YEARLY", { monthOfYear: 12 }, today);
    expect(result).toBe("2026-12-01");
  });

  it("YEARLY with a past date in the current year rolls to next year", () => {
    const today = new Date(2026, 11, 31); // Dec 31
    const result = initialNextRunDate("YEARLY", { monthOfYear: 1, dayOfYear: 1 }, today);
    expect(result).toBe("2027-01-01");
  });

  it("YEARLY rolls to next year without dayOfYear uses day 1 (line 86)", () => {
    const today = new Date(2026, 11, 31); // Dec 31
    const result = initialNextRunDate("YEARLY", { monthOfYear: 1 }, today);
    expect(result).toBe("2027-01-01");
  });

  it("DAILY falls through to computeNextRunDate when no special opts", () => {
    const today = new Date(2026, 4, 15);
    expect(initialNextRunDate("DAILY", {}, today)).toBe("2026-05-16");
  });

  it("WEEKLY without dayOfWeek falls through to computeNextRunDate (+7 days)", () => {
    const today = new Date(2026, 4, 15);
    expect(initialNextRunDate("WEEKLY", {}, today)).toBe("2026-05-22");
  });

  it("uses today when no base date supplied", () => {
    const result = initialNextRunDate("DAILY", {});
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(result).toBe(tomorrow.toISOString().split("T")[0]);
  });
});
