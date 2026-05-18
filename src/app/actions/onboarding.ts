"use server";

import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/db";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  onboardingNameSchema,
} from "@/lib/validations/onboarding";

export async function updateUserName(
  name: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.email || !session.user.id) return { error: "Unauthorized" };

  const parsed = onboardingNameSchema.safeParse({ name });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `USER#${session.user.email}`,
        sk: `PROFILE#${session.user.email}`,
      },
      UpdateExpression: "SET #n = :name, updatedAt = :now",
      ExpressionAttributeNames: { "#n": "name" },
      ExpressionAttributeValues: {
        ":name": parsed.data.name,
        ":now": now,
      },
    }),
  );

  return {};
}

export async function completeOnboarding(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `USER#${session.user.email}`,
        sk: `PROFILE#${session.user.email}`,
      },
      UpdateExpression: "SET onboardingCompleted = :val, updatedAt = :now",
      ExpressionAttributeValues: {
        ":val": true,
        ":now": new Date().toISOString(),
      },
    }),
  );

  return {};
}
