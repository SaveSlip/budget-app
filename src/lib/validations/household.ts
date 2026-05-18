import { z } from "zod";

export const createHouseholdSchema = z.object({
  name: z.string().min(1, "Household name is required").max(50),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const addNonUserMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
});

export const inviteNonUserMemberSchema = z.object({
  nonUserId: z.string().min(1),
  email: z.string().email("Please enter a valid email address"),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type AddNonUserMemberInput = z.infer<typeof addNonUserMemberSchema>;
export type InviteNonUserMemberInput = z.infer<typeof inviteNonUserMemberSchema>;
