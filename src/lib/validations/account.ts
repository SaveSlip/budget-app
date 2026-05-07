import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT", "CASH", "INVESTMENT", "OTHER"]),
  initialBalance: z.number().default(0),
});

export type AccountInput = z.infer<typeof accountSchema>;
