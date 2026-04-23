// src/app/actions/auth.ts
"use server";

import { signupSchema, SignupInput } from "@/lib/validations/auth";
// Note: You will need to install bcryptjs or argon2 for enterprise-grade hashing

export async function registerUser(data: SignupInput) {
  // 1. Strict Backend Validation
  const result = signupSchema.safeParse(data);

  if (!result.success) {
    return {
      error: "Malformed request payload.",
      details: result.error.flatten(),
    };
  }

  const { email, password } = result.data;

  try {
    // 2. Hash Password (e.g., await bcrypt.hash(password, 12))

    // 3. Provision User in DynamoDB via SST Resource bindings
    // Example:
    // await dynamoDbClient.put({
    //   TableName: Resource.BudgifyUsersTable.name,
    //   Item: { pk: `USER#${email}`, email, passwordHash, createdAt: Date.now() }
    // });

    return { success: true };
  } catch (error) {
    console.error("Database provisioning failed:", error);
    return { error: "Internal system error during provisioning." };
  }
}
