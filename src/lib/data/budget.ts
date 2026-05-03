// src/lib/data/budget.ts
import { db, TABLE_NAME } from "@/lib/db";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { auth } from "@/auth";

/**
 * Retrieves all budget-related items for a specific month.
 * Utilizes the Single-Table Design pattern to fetch summaries and
 * transactions in a single round-trip where possible.
 */
export async function getMonthlyData(yearMonth: string) {
  const session = await auth();

  // Zero-Trust: Ensure the user is authenticated before querying
  if (!session?.user?.id) {
    throw new Error(
      "Unauthorized: Access to financial data requires a valid session.",
    );
  }

  const userId = session.user.id;

  try {
    const result = await db.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        // Query pattern: Find all items for this user starting with the month prefix
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":sk": `BUDGET#${yearMonth}`,
        },
      }),
    );

    return result.Items || [];
  } catch (error) {
    // Institutional Logging: Maintain clear error boundaries for debugging
    console.error(
      `[DAL] Failed to fetch monthly data for ${yearMonth}:`,
      error,
    );
    throw new Error("Internal Server Error: Data retrieval failed.");
  }
}
/**
 * Retrieves all defined budget categories for the authenticated user.
 */
export async function getCategories() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: Access requires a valid session.");
  }

  try {
    const result = await db.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        // Query pattern: Find all items for this user where the Sort Key begins with "CAT#"
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${session.user.id}`,
          ":sk": "CAT#",
        },
      }),
    );

    return result.Items || [];
  } catch (error) {
    console.error("[DAL] Failed to fetch categories:", error);
    throw new Error("Internal Server Error: Category retrieval failed.");
  }
}
