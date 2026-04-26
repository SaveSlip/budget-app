"use server";

import bcrypt from "bcryptjs";
import { signupSchema, SignupInput } from "@/lib/validations/auth";
import { createUserRecord } from "@/lib/db";

export async function registerUser(data: SignupInput) {
  try {
    const parsed = signupSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid input data" };
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    await createUserRecord(parsed.data.email, hashedPassword);

    return { success: true };
  } catch (error) {
    console.error("Failed to register user:", error);
    return { error: "Internal Server Error" };
  }
}
