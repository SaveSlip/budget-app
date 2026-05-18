"use server";

import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/db";
import { PutCommand, UpdateCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import {
  onboardingNameSchema,
  onboardingCreateHouseholdSchema,
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

  // Propagate name to household member record if user is in a household
  const linkResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${session.user.id}`,
        ":prefix": "HOUSEHOLD_MEMBER#",
      },
      Limit: 1,
    }),
  );
  const link = linkResult.Items?.[0];
  if (link?.householdId) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `HOUSEHOLD#${link.householdId}`,
          sk: `MEMBER#${session.user.id}`,
        },
        UpdateExpression: "SET #n = :name",
        ExpressionAttributeNames: { "#n": "name" },
        ExpressionAttributeValues: { ":name": parsed.data.name },
      }),
    ).catch(() => {
      // Member record may not exist yet; ignore
    });
  }

  return {};
}

export async function createHouseholdDuringOnboarding(
  householdName: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" };

  const parsed = onboardingCreateHouseholdSchema.safeParse({ householdName });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${session.user.id}`,
        ":prefix": "HOUSEHOLD_MEMBER#",
      },
      Limit: 1,
    }),
  );
  if (existing.Items && existing.Items.length > 0) {
    return { error: "You already belong to a household." };
  }

  const householdId = randomUUID();
  const now = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD#${householdId}`,
        sk: "METADATA",
        id: householdId,
        type: "HOUSEHOLD",
        name: parsed.data.householdName,
        masterUserId: session.user.id,
        createdAt: now,
      },
    }),
  );

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `USER#${session.user.id}`,
        sk: `HOUSEHOLD_MEMBER#${householdId}`,
        householdId,
        role: "MASTER",
        joinedAt: now,
      },
    }),
  );

  const { Item: profile } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${session.user.email}`, sk: `PROFILE#${session.user.email}` },
    }),
  );
  const userName = (profile?.name as string) || "";

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD#${householdId}`,
        sk: `MEMBER#${session.user.id}`,
        id: session.user.id,
        name: userName,
        email: session.user.email,
        role: "MASTER",
        canViewHousehold: true,
        createdAt: now,
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

