"use server";

import { auth } from "@/auth";
import { docClient, TABLE_NAME, getUserProfile } from "@/lib/db";
import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import {
  onboardingNameSchema,
  onboardingCreateHouseholdSchema,
  onboardingJoinHouseholdSchema,
} from "@/lib/validations/onboarding";

export async function updateUserName(
  name: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  const parsed = onboardingNameSchema.safeParse({ name });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

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
        ":now": new Date().toISOString(),
      },
    }),
  );

  return {};
}

async function generateUniquePin(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `HOUSEHOLD_PIN#${pin}`, sk: "HOUSEHOLD_PIN" },
      }),
    );
    if (!Item) return pin;
  }
  // Extremely unlikely to fail 3 times but fall back to uuid-derived pin
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createHouseholdWithPin(
  householdName: string,
): Promise<{ pin?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" };

  const parsed = onboardingCreateHouseholdSchema.safeParse({ householdName });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Check user doesn't already have a household
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
  const pin = await generateUniquePin();
  const now = new Date().toISOString();

  // Household metadata
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
        pin,
        createdAt: now,
      },
    }),
  );

  // User → household link (MASTER role)
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

  // PIN index record for member join lookup
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD_PIN#${pin}`,
        sk: "HOUSEHOLD_PIN",
        householdId,
        masterUserId: session.user.id,
        createdAt: now,
      },
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );

  return { pin };
}

export async function joinHouseholdByPin(
  pin: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" };

  const parsed = onboardingJoinHouseholdSchema.safeParse({ pin });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Look up PIN index
  const { Item: pinRecord } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `HOUSEHOLD_PIN#${parsed.data.pin}`, sk: "HOUSEHOLD_PIN" },
    }),
  );

  if (!pinRecord) {
    return {
      error: "Invalid PIN. Double-check the code your household master shared.",
    };
  }

  const householdId = pinRecord.householdId as string;

  // Check user doesn't already have a household link
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
    return { error: "You are already part of a household." };
  }

  // Get user's current name
  const profile = await getUserProfile(session.user.email);
  const memberName = (profile?.name as string) || session.user.email;
  const now = new Date().toISOString();

  // Create MEMBER record in household (using userId as memberId for real accounts)
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD#${householdId}`,
        sk: `MEMBER#${session.user.id}`,
        id: session.user.id,
        name: memberName,
        email: session.user.email,
        role: "MEMBER",
        canViewHousehold: false,
        createdAt: now,
      },
    }),
  );

  // Create user → household link
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `USER#${session.user.id}`,
        sk: `HOUSEHOLD_MEMBER#${householdId}`,
        householdId,
        role: "MEMBER",
        canViewHousehold: false,
        joinedAt: now,
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
