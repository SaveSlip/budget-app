"use server";

import { QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "@/lib/db";
import { auth } from "@/auth";

export type CategoryRule = {
  id: string;
  merchantKeyword: string;
  categoryName: string;
  transactionType: "EXPENSE" | "INCOME";
  createdAt: string;
};

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  try {
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":prefix": "RULE#",
        },
      }),
    );
    return (Items ?? []) as CategoryRule[];
  } catch (error) {
    console.error("Failed to fetch category rules:", error);
    return [];
  }
}

export async function saveCategoryRule(
  merchantKeyword: string,
  categoryName: string,
  transactionType: "EXPENSE" | "INCOME",
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Unauthorized" };

  const normalized = merchantKeyword.toLowerCase().trim();
  if (!normalized) return { error: "Merchant keyword cannot be empty." };

  try {
    // Check for existing rule with the same keyword to avoid duplicates
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        FilterExpression: "merchantKeyword = :kw",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":prefix": "RULE#",
          ":kw": normalized,
        },
      }),
    );

    // Reuse existing rule ID if one exists, otherwise generate new
    const existingId = Items?.[0]?.id as string | undefined;
    const ruleId = existingId ?? crypto.randomUUID();

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${userId}`,
          sk: `RULE#${ruleId}`,
          id: ruleId,
          type: "CATEGORY_RULE",
          merchantKeyword: normalized,
          categoryName,
          transactionType,
          createdAt: new Date().toISOString(),
        },
      }),
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to save category rule:", error);
    return { error: "Failed to save rule." };
  }
}
