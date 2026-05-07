import { z } from "zod";

/**
 * Schema for Budget Categories
 * Uses z.coerce.number() to ensure HTML form strings are converted to
 * valid numbers before validation.
 */
export const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  limit: z.number().min(0, "Limit must be at least 0"),
});

// Infer the TypeScript type directly from the schema
export type CategoryInput = z.infer<typeof CategorySchema>;
