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
 * Defines the allocation and type for monthly budget tracking.
 */
export const CategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  monthlyAllocated: z.number().nonnegative("Allocation cannot be negative"),
  type: z.enum(["fixed", "variable"]),
});

export type TransactionInput = z.infer<typeof TransactionSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
