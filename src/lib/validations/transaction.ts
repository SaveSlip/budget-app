import { z } from "zod";

export const transactionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z
    .number()
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount")),
  date: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")),
  category: z.string().min(1, "Category is required"),
  transactionType: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
