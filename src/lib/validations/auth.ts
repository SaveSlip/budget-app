// src/lib/validations/auth.ts
import { z } from "zod";

export const signupSchema = z
  .object({
    email: z.string().email("Invalid enterprise email address format."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters for compliance."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Cryptographic keys (passwords) do not match.",
    path: ["confirmPassword"],
  });

export const signinSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
