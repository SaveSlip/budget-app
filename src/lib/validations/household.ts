import { z } from "zod";

export const createHouseholdSchema = z.object({
  name: z.string().min(1, "Household name is required").max(50),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
