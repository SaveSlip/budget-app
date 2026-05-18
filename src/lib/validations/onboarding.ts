import { z } from "zod";

export const onboardingNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name is too long"),
});

export type OnboardingNameInput = z.infer<typeof onboardingNameSchema>;
