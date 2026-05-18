// src/lib/db.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

// Initialize the base raw client
const client = new DynamoDBClient({});

/**
 * Enhanced Document Client (docClient)
 * - removeUndefinedValues: Essential for serverless functions to prevent DynamoDB validation errors.
 * - convertClassInstanceToMap: Ensures complex objects are correctly persisted.
 */
export const docClient = DynamoDBDocumentClient.from(client, {
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
  emailVerified?: boolean;
}

/**
 * Creates a new user profile record in the DynamoDB table.
 */
export async function createUserRecord(params: UserRecordParams) {
  const { id, email, name, hashedPassword, emailVerified } = params;

  try {
    // FIXED: Now correctly routing the PutCommand through the Document Client
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${email}`,
          sk: `PROFILE#${email}`,
          id: id,
          type: "USER",
          email: email,
          name: name || "",
          passwordHash: hashedPassword || null,
          emailVerified: emailVerified ?? false,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
        },
        // Prevent overwriting by strictly checking if the PK exists
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return { success: true };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return {
        error: "An account with this email already exists. Please sign in.",
      };
    }

    console.error("[DB] Failed to create user record:", error);
    return {
      error:
        "We couldn't create your account right now. Please try again in a moment.",
    };
  }
}

export async function deletePartition(pk: string): Promise<void> {
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        ProjectionExpression: "pk, sk",
        ExclusiveStartKey: lastKey,
      }),
    );
    const items = result.Items ?? [];
    for (let i = 0; i < items.length; i += 25) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: items.slice(i, i + 25).map((item) => ({
              DeleteRequest: { Key: { pk: item.pk, sk: item.sk } },
            })),
          },
        }),
      );
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
}

export async function getUserProfile(email: string) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
    }),
  );
  return Item ?? null;
}
