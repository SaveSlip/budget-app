import { z } from "zod";

export const recurringTransactionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  transactionType: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  accountId: z.string().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  // MONTHLY: pin to a specific day 1–31 (snaps to last day of month for short months)
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  // WEEKLY: 0=Sunday … 6=Saturday
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  // YEARLY: monthOfYear 1–12, dayOfYear 1–31
  monthOfYear: z.number().int().min(1).max(12).optional(),
  dayOfYear: z.number().int().min(1).max(31).optional(),
  isActive: z.boolean().default(true),
});

export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>;
