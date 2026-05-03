// src/lib/db.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

// Initialize the base client
const client = new DynamoDBClient({});

/**
 * Enhanced Document Client
 * - removeUndefinedValues: Essential for serverless functions to prevent DynamoDB validation errors.
 * - convertClassInstanceToMap: Ensures complex objects are correctly persisted.
 */
export const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

/**
 * Resource Binding
 * Adhering to the project's Single-Table Design pillar.
 * Ensure the table name in sst.config.ts matches 'BudgifyTable'.
 */
export const TABLE_NAME = Resource.BudgifyTable.name;
export interface UserRecordParams {
  id: string;
  email: string;
  name?: string;
  hashedPassword?: string;
}

/**
 * Creates a new user profile record in the DynamoDB table.
 */
export async function createUserRecord(params: UserRecordParams) {
  const { id, email, name, hashedPassword } = params;

  try {
    await client.send(
      new PutCommand({
        TableName: Resource.BudgifyTable.name,
        Item: {
          pk: `USER#${email}`,
          sk: `PROFILE#${email}`,
          id: id,
          type: "USER",
          email: email,
          name: name || "",
          passwordHash: hashedPassword || null,
          createdAt: new Date().toISOString(),
        },
        // THE FIX: Prevent overwriting by strictly checking if the PK exists
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return { success: true };
  } catch (error: any) {
    // Broaden the check to catch AWS SDK v3 conditional errors more reliably
    if (
      error.name === "ConditionalCheckFailedException" ||
      error.$metadata?.httpStatusCode === 400 ||
      error.message?.includes("conditional")
    ) {
      return {
        error: "An account with this email already exists. Please sign in.",
      };
    }

    // The generic fallback using user-friendly language
    console.error("[DB] Failed to create user record:", error);
    return {
      error:
        "We couldn't create your account right now. Please try again in a moment.",
    };
  }
}
