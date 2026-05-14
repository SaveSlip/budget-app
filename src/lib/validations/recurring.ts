import { z } from "zod";

export const recurringTransactionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  transactionType: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  accountId: z.string().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  isActive: z.boolean().default(true),
});

export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>;
