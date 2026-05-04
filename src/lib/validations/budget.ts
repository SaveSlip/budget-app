import { z } from "zod";

/**
 * Transaction Schema
 * Enforces strict data types for enterprise-grade financial reporting.
 */
export const TransactionSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required").max(100),
  date: z.string().datetime({ message: "Invalid ISO 8601 date string" }),
});

/**
 * Category Schema
 * Used for creating and updating budget categories with monthly limits.
 */
export const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Category name is required").max(50),
  limit: z.coerce
    .number()
    .nonnegative("Budget limit must be 0 or greater")
    .default(0),
});

export type Category = z.infer<typeof CategorySchema>;

export type TransactionInput = z.infer<typeof TransactionSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
