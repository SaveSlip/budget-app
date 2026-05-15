"use server";

import { auth } from "@/auth";
import { deletePartition, docClient, TABLE_NAME } from "@/lib/db";
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { assertAuthorized, ForbiddenError } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import {
  createHouseholdSchema,
  addMemberSchema,
  type CreateHouseholdInput,
  type AddMemberInput,
} from "@/lib/validations/household";
import type { Household, HouseholdMember } from "@/lib/data/budget";

// --- Read helpers ---

export async function getHousehold(): Promise<{ household: Household | null; members: HouseholdMember[] }> {
  const session = await auth();
  if (!session?.user?.id) return { household: null, members: [] };

  // Find the user's household membership link
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
  if (!link) return { household: null, members: [] };

  const householdId = link.householdId as string;

  // Fetch household metadata
  const metaResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `HOUSEHOLD#${householdId}`,
        sk: "METADATA",
      },
    }),
  );

  if (!metaResult.Item) return { household: null, members: [] };

  const household: Household = {
    id: metaResult.Item.id,
    name: metaResult.Item.name,
    masterUserId: metaResult.Item.masterUserId,
    pin: metaResult.Item.pin as string | undefined,
    createdAt: metaResult.Item.createdAt,
  };

  // Fetch members
  const membersResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `HOUSEHOLD#${householdId}`,
        ":prefix": "MEMBER#",
      },
    }),
  );

  const members = (membersResult.Items ?? []) as HouseholdMember[];
  return { household, members };
}

// --- Mutations ---

export async function createHousehold(
  data: CreateHouseholdInput,
): Promise<{ error?: string; householdId?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = createHouseholdSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Check if user already has a household
  const existing = await getHousehold();
  if (existing.household) return { error: "You already belong to a household." };

  const householdId = randomUUID();
  const pin = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date().toISOString();

  // Create household metadata record (includes PIN)
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD#${householdId}`,
        sk: "METADATA",
        id: householdId,
        type: "HOUSEHOLD",
        name: parsed.data.name,
        masterUserId: session.user.id,
        pin,
        createdAt: now,
      },
    }),
  );

  // Link user to household as master
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

  // PIN index record so members can join by PIN
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
    }),
  );

  revalidatePath("/dashboard/settings/household");
  return { householdId };
}

export async function addHouseholdMember(
  data: AddMemberInput,
): Promise<{ error?: string; memberId?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const parsed = addMemberSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { household } = await getHousehold();
  if (!household) return { error: "You don't have a household yet." };
  if (household.masterUserId !== session.user.id) {
    return { error: "Only the household master can add members." };
  }

  const memberId = randomUUID();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD#${household.id}`,
        sk: `MEMBER#${memberId}`,
        id: memberId,
        type: "HOUSEHOLD_MEMBER",
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        role: "MEMBER",
        canViewHousehold: false,
        createdAt: new Date().toISOString(),
      },
    }),
  );

  revalidatePath("/dashboard/settings/household");
  return { memberId };
}

export async function removeHouseholdMember(
  memberId: string,
  deleteData: boolean = false,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const { household } = await getHousehold();
  if (!household) return { error: "No household found." };
  if (household.masterUserId !== session.user.id) {
    return { error: "Only the household master can remove members." };
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `HOUSEHOLD#${household.id}`,
        sk: `MEMBER#${memberId}`,
      },
    }),
  );

  if (deleteData) {
    await deletePartition(`USER#${memberId}`);
  }

  revalidatePath("/dashboard/settings/household");
  return {};
}

export async function grantHouseholdAccess(
  memberId: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const { household } = await getHousehold();
  if (!household) return { error: "No household found." };
  if (household.masterUserId !== session.user.id) {
    return { error: "Only the household master can grant access." };
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `HOUSEHOLD#${household.id}`,
        sk: `MEMBER#${memberId}`,
      },
      UpdateExpression: "SET canViewHousehold = :val",
      ExpressionAttributeValues: { ":val": true },
    }),
  );

  revalidatePath("/dashboard/settings/household");
  return {};
}

export async function revokeHouseholdAccess(
  memberId: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const { household } = await getHousehold();
  if (!household) return { error: "No household found." };
  if (household.masterUserId !== session.user.id) {
    return { error: "Only the household master can revoke access." };
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `HOUSEHOLD#${household.id}`,
        sk: `MEMBER#${memberId}`,
      },
      UpdateExpression: "SET canViewHousehold = :val",
      ExpressionAttributeValues: { ":val": false },
    }),
  );

  revalidatePath("/dashboard/settings/household");
  return {};
}
