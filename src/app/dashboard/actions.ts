"use server";
import { TransactionSchema, CategorySchema } from "@/lib/validations/budget";
import { auth } from "@/auth";
import { db, TABLE_NAME } from "@/lib/db";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { revalidatePath } from "next/cache";

/**
 * Server Action: addCategory
 * Validates and persists a new budget category definition.
 */
export async function addCategory(formData: unknown) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized. Please sign in." };
  }

  const validated = CategorySchema.safeParse(formData);
  if (!validated.success) {
    return { error: "Invalid input data." };
  }

  const { name, monthlyAllocated, type } = validated.data;
  const userId = session.user.id;
  const catId = crypto.randomUUID();

  try {
    await db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${userId}`,
          sk: `CAT#${catId}`,
          type: "CATEGORY",
          name,
          monthlyAllocated,
          expenseType: type, // "fixed" or "variable"
          createdAt: new Date().toISOString(),
        },
      }),
    );

    // Invalidate the cache for the settings page to reflect the new data
    revalidatePath("/dashboard/settings/categories");

    return { success: true };
  } catch (error) {
    console.error("[Action] Category creation failed:", error);
    return { error: "Failed to save category to the database." };
  }
}
/**
 * Server Action: addTransaction
 * Validates and persists a new financial transaction to DynamoDB.
 */
export async function addTransaction(formData: unknown) {
  const session = await auth();

  // 1. Authentication Guard
  if (!session?.user?.id) {
    return { error: "Unauthorized. Please sign in to perform this action." };
  }

  // 2. Data Validation
  const validated = TransactionSchema.safeParse(formData);
  if (!validated.success) {
    return {
      error: "Invalid input data.",
      details: validated.error.flatten().fieldErrors,
    };
  }

  const { amount, categoryId, description, date } = validated.data;
  const userId = session.user.id;
  const txId = crypto.randomUUID();
  const timestamp = new Date(date).getTime();

  try {
    // 3. Persistence with Single-Table Design
    await db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${userId}`,
          // Sort Key pattern: TX#<timestamp>#<unique_id> for chronological sorting
          sk: `TX#${timestamp}#${txId}`,
          type: "TRANSACTION",
          amount,
          categoryId,
          description,
          date,
          createdAt: new Date().toISOString(),
        },
      }),
    );

    // 4. Cache Invalidation
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[Action] Transaction creation failed:", error);
    return { error: "Failed to save transaction to the database." };
  }
}
