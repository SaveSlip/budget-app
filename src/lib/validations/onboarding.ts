import { z } from "zod";

export const onboardingNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name is too long"),
});

export const onboardingRoleSchema = z.object({
  role: z.enum(["MASTER", "MEMBER"]),
});

export const onboardingCreateHouseholdSchema = z.object({
  householdName: z
    .string()
    .min(1, "Household name is required")
    .max(50, "Household name is too long"),
});

export type OnboardingNameInput = z.infer<typeof onboardingNameSchema>;
export type OnboardingRoleInput = z.infer<typeof onboardingRoleSchema>;
export type OnboardingCreateHouseholdInput = z.infer<
  typeof onboardingCreateHouseholdSchema
>;
