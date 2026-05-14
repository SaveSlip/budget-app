import { z } from "zod";

export const createHouseholdSchema = z.object({
  name: z.string().min(1, "Household name is required").max(50),
});

export const addMemberSchema = z.object({
  name: z.string().min(1, "Member name is required").max(50),
  email: z.string().email().optional().or(z.literal("")),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
