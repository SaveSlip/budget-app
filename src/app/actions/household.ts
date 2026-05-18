"use server";

import { auth } from "@/auth";
import { deletePartition, docClient, TABLE_NAME } from "@/lib/db";
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
  BatchWriteCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { assertAuthorized, ForbiddenError } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";
import {
  createHouseholdSchema,
  inviteMemberSchema,
  addNonUserMemberSchema,
  inviteNonUserMemberSchema,
  type CreateHouseholdInput,
  type InviteMemberInput,
  type AddNonUserMemberInput,
  type InviteNonUserMemberInput,
} from "@/lib/validations/household";
import type { Household, HouseholdMember, HouseholdInvite } from "@/lib/data/budget";
import { getHouseholdMonthlyData, getHouseholdMonthlyBalance, type HouseholdTransaction, type HouseholdMonthlyBalance } from "@/lib/data/budget";

const sesClient = new SESClient({ region: process.env.AWS_REGION ?? "us-east-1" });

// --- Read helpers ---

export async function getHousehold(): Promise<{ household: Household | null; members: HouseholdMember[] }> {
  const session = await auth();
  if (!session?.user?.id) return { household: null, members: [] };

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
    createdAt: metaResult.Item.createdAt,
  };

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

  let members = (membersResult.Items ?? []) as HouseholdMember[];

  // Backfill: if the admin has no MEMBER# record, or the record has an empty name, repair it
  const existingAdminMember = members.find((m) => m.id === household.masterUserId);
  const needsRepair =
    !existingAdminMember ||
    (!existingAdminMember.name && session.user.id === household.masterUserId);

  if (needsRepair) {
    let adminName: string;
    let adminEmail: string;
    if (session.user.id === household.masterUserId) {
      adminName = session.user.name ?? session.user.email ?? "";
      adminEmail = session.user.email ?? "";
    } else if (metaResult.Item.adminName || metaResult.Item.adminEmail) {
      adminName = metaResult.Item.adminName ?? metaResult.Item.adminEmail ?? "";
      adminEmail = metaResult.Item.adminEmail ?? "";
    } else {
      adminName = "";
      adminEmail = "";
    }

    if (existingAdminMember) {
      members = members.map((m) =>
        m.id === household.masterUserId ? { ...m, name: adminName } : m,
      );
    } else {
      const adminMember: HouseholdMember = {
        id: household.masterUserId,
        name: adminName,
        email: adminEmail,
        role: "MASTER",
        canViewHousehold: true,
        createdAt: household.createdAt,
      };
      members = [adminMember, ...members];
    }

    // Persist the corrected record so future fetches don't need to repair
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `HOUSEHOLD#${household.id}`,
          sk: `MEMBER#${household.masterUserId}`,
          id: household.masterUserId,
          name: adminName,
          email: adminEmail || existingAdminMember?.email || "",
          role: "MASTER",
          canViewHousehold: true,
          createdAt: existingAdminMember?.createdAt ?? household.createdAt,
        },
      }),
    ).catch(() => {});
  }

  return { household, members };
}

// Returns pending invites sent by this household (for the admin view)
export async function getHouseholdPendingInvites(): Promise<HouseholdInvite[]> {
  const { household } = await getHousehold();
  if (!household) return [];

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `HOUSEHOLD#${household.id}`,
        ":prefix": "INVITE#",
      },
    }),
  );

  return (result.Items ?? [])
    .filter((i) => i.status === "PENDING")
    .map((i) => ({
      token: i.token as string,
      householdId: i.householdId as string,
      householdName: i.householdName as string,
      inviterName: i.inviterName as string,
      email: i.email as string,
      status: i.status as "PENDING",
      createdAt: i.createdAt as string,
      expiresAt: i.expiresAt as string,
      nonUserId: i.nonUserId as string | undefined,
    }));
}

// Returns pending invites received by the current user (by email)
export async function getMyPendingInvites(): Promise<HouseholdInvite[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${session.user.email}`,
        ":prefix": "PENDING_INVITE#",
      },
    }),
  );

  return (result.Items ?? []).map((i) => ({
    token: i.token as string,
    householdId: i.householdId as string,
    householdName: i.householdName as string,
    inviterName: i.inviterName as string,
    email: session.user!.email as string,
    status: "PENDING" as const,
    createdAt: i.createdAt as string,
    expiresAt: i.expiresAt as string,
  }));
}

// --- Mutations ---

export async function createHousehold(
  data: CreateHouseholdInput,
): Promise<{ error?: string; householdId?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = createHouseholdSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await getHousehold();
  if (existing.household) return { error: "You already belong to a household." };

  const householdId = randomUUID();
  const now = new Date().toISOString();

  const adminName = session.user.name ?? session.user.email ?? "";
  const adminEmail = session.user.email ?? "";

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
        adminName,
        adminEmail,
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

  // Write the admin's MEMBER# record so they appear in the members list
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD#${householdId}`,
        sk: `MEMBER#${session.user.id}`,
        id: session.user.id,
        name: adminName,
        email: adminEmail,
        role: "MASTER",
        canViewHousehold: true,
        createdAt: now,
      },
    }),
  );

  revalidatePath("/dashboard/settings/household");
  revalidatePath("/dashboard", "layout");
  return { householdId };
}

export async function sendHouseholdInvite(
  data: InviteMemberInput,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const parsed = inviteMemberSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { household } = await getHousehold();
  if (!household) return { error: "You don't have a household yet." };
  if (household.masterUserId !== session.user.id) {
    return { error: "Only the household admin can send invites." };
  }

  const inviteeEmail = parsed.data.email.toLowerCase();

  // Don't invite yourself
  if (inviteeEmail === session.user.email.toLowerCase()) {
    return { error: "You cannot invite yourself." };
  }

  // Check if the invitee is already a member
  const existingMemberResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `HOUSEHOLD#${household.id}`,
        ":prefix": "MEMBER#",
      },
    }),
  );
  const alreadyMember = (existingMemberResult.Items ?? []).some(
    (m) => (m.email as string)?.toLowerCase() === inviteeEmail,
  );
  if (alreadyMember) return { error: "This person is already a member of your household." };

  // Check for an existing pending invite for this email by querying household-scoped invite records
  const existingHouseholdInvitesResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `HOUSEHOLD#${household.id}`,
        ":prefix": "INVITE#",
      },
    }),
  );
  const alreadyInvited = (existingHouseholdInvitesResult.Items ?? []).some(
    (i) => (i.email as string)?.toLowerCase() === inviteeEmail && i.status === "PENDING",
  );
  if (alreadyInvited) {
    return { error: "An invite has already been sent to this email." };
  }

  // Look up the invitee's profile (used for household check, stale-notification cleanup, and in-app notification)
  const { Item: inviteeProfile } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${inviteeEmail}`, sk: `PROFILE#${inviteeEmail}` },
    }),
  );

  // Block invite if the invitee already belongs to another household
  if (inviteeProfile) {
    const existingHouseholdLink = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${inviteeProfile.id as string}`,
          ":prefix": "HOUSEHOLD_MEMBER#",
        },
        Limit: 1,
      }),
    );
    if (existingHouseholdLink.Items && existingHouseholdLink.Items.length > 0) {
      return { error: "This person is already a member of another household." };
    }
  }

  // Clean up any stale PENDING_INVITE# notification records for orphaned (deleted) profiles
  const existingNotificationResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${inviteeEmail}`,
        ":prefix": "PENDING_INVITE#",
      },
      Limit: 1,
    }),
  );
  if (existingNotificationResult.Items && existingNotificationResult.Items.length > 0) {
    if (!inviteeProfile) {
      // Profile gone — delete stale notification records
      await Promise.all(
        existingNotificationResult.Items.map((item) =>
          docClient.send(
            new DeleteCommand({
              TableName: TABLE_NAME,
              Key: { pk: item.pk as string, sk: item.sk as string },
            }),
          ),
        ),
      );
    }
  }

  const token = randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const inviterName = session.user.name ?? session.user.email;
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const joinLink = `${baseUrl}/join?token=${token}`;

  // Token lookup record (used by /join page)
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD_INVITE#${token}`,
        sk: "HOUSEHOLD_INVITE",
        token,
        householdId: household.id,
        householdName: household.name,
        inviterName,
        email: inviteeEmail,
        status: "PENDING",
        createdAt: now,
        expiresAt,
      },
    }),
  );

  // Household-scoped invite record (for admin to see pending list)
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD#${household.id}`,
        sk: `INVITE#${token}`,
        token,
        householdId: household.id,
        householdName: household.name,
        inviterName,
        email: inviteeEmail,
        status: "PENDING",
        createdAt: now,
        expiresAt,
      },
    }),
  );

  if (inviteeProfile) {
    // In-app notification record for existing users
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${inviteeEmail}`,
          sk: `PENDING_INVITE#${household.id}`,
          token,
          householdId: household.id,
          householdName: household.name,
          inviterName,
          createdAt: now,
          expiresAt,
        },
      }),
    );
  }

  // Send invite email
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: Resource.EmailIdentity.sender,
        Destination: { ToAddresses: [inviteeEmail] },
        Message: {
          Subject: { Data: `${inviterName} invited you to join ${household.name} on Budgify`, Charset: "UTF-8" },
          Body: {
            Html: {
              Data: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">You've been invited to Budgify!</h2>
                  <p>Hello,</p>
                  <p><strong>${inviterName}</strong> has invited you to join their household <strong>${household.name}</strong> on Budgify — a smart budgeting app for families.</p>
                  <p style="margin: 30px 0;">
                    <a href="${joinLink}" style="background-color: #a8471f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Join ${household.name}</a>
                  </p>
                  <p><strong>This invite expires in 7 days.</strong></p>
                  <p>If you don't have a Budgify account yet, you'll be prompted to create one when you click the link above.</p>
                  <p>If you did not expect this invitation, you can safely ignore this email.</p>
                </div>
              `,
              Charset: "UTF-8",
            },
          },
        },
      }),
    );
  } catch (emailError) {
    console.error("Failed to send invite email:", emailError);
    if (process.env.NODE_ENV !== "production") {
      return {};
    }
    // Clean up the invite records if email failed
    await Promise.all([
      docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `HOUSEHOLD_INVITE#${token}`, sk: "HOUSEHOLD_INVITE" } })),
      docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `HOUSEHOLD#${household.id}`, sk: `INVITE#${token}` } })),
      inviteeProfile
        ? docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `USER#${inviteeEmail}`, sk: `PENDING_INVITE#${household.id}` } }))
        : Promise.resolve(),
    ]);
    return { error: "Failed to send invite email. Please try again." };
  }

  revalidatePath("/dashboard/settings/household");
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function addNonUserMember(
  data: AddNonUserMemberInput,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const parsed = addNonUserMemberSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { household } = await getHousehold();
  if (!household) return { error: "You don't have a household yet." };
  if (household.masterUserId !== session.user.id) {
    return { error: "Only the household admin can add members." };
  }

  const id = `NONUSER_${randomUUID()}`;
  const now = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD#${household.id}`,
        sk: `MEMBER#${id}`,
        id,
        name: parsed.data.name,
        role: "MEMBER",
        canViewHousehold: false,
        isNonUser: true,
        createdAt: now,
      },
    }),
  );

  revalidatePath("/dashboard/settings/household");
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function sendNonUserInvite(
  data: InviteNonUserMemberInput,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const parsed = inviteNonUserMemberSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { household } = await getHousehold();
  if (!household) return { error: "You don't have a household yet." };
  if (household.masterUserId !== session.user.id) {
    return { error: "Only the household admin can send invites." };
  }

  // Verify the non-user member exists in this household
  const { Item: nonUserRecord } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `HOUSEHOLD#${household.id}`,
        sk: `MEMBER#${parsed.data.nonUserId}`,
      },
    }),
  );
  if (!nonUserRecord || !nonUserRecord.isNonUser) {
    return { error: "Non-user member not found." };
  }

  const inviteeEmail = parsed.data.email.toLowerCase();

  if (inviteeEmail === session.user.email.toLowerCase()) {
    return { error: "You cannot invite yourself." };
  }

  // Check for an existing pending invite for this email by querying household-scoped invite records
  const existingHouseholdInvitesResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `HOUSEHOLD#${household.id}`,
        ":prefix": "INVITE#",
      },
    }),
  );
  const alreadyInvited = (existingHouseholdInvitesResult.Items ?? []).some(
    (i) => (i.email as string)?.toLowerCase() === inviteeEmail && i.status === "PENDING",
  );
  if (alreadyInvited) {
    return { error: "An invite has already been sent to this email." };
  }

  // Clean up any stale PENDING_INVITE# notification records for orphaned (deleted) profiles
  const existingNotificationResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${inviteeEmail}`,
        ":prefix": "PENDING_INVITE#",
      },
      Limit: 1,
    }),
  );
  if (existingNotificationResult.Items && existingNotificationResult.Items.length > 0) {
    const { Item: inviteeProfile } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${inviteeEmail}`, sk: `PROFILE#${inviteeEmail}` },
      }),
    );
    if (!inviteeProfile) {
      await Promise.all(
        existingNotificationResult.Items.map((item) =>
          docClient.send(
            new DeleteCommand({
              TableName: TABLE_NAME,
              Key: { pk: item.pk as string, sk: item.sk as string },
            }),
          ),
        ),
      );
    }
  }

  const token = randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const inviterName = session.user.name ?? session.user.email;
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const joinLink = `${baseUrl}/join?token=${token}`;
  const nonUserId = parsed.data.nonUserId;

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD_INVITE#${token}`,
        sk: "HOUSEHOLD_INVITE",
        token,
        householdId: household.id,
        householdName: household.name,
        inviterName,
        email: inviteeEmail,
        status: "PENDING",
        nonUserId,
        createdAt: now,
        expiresAt,
      },
    }),
  );

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD#${household.id}`,
        sk: `INVITE#${token}`,
        token,
        householdId: household.id,
        householdName: household.name,
        inviterName,
        email: inviteeEmail,
        status: "PENDING",
        nonUserId,
        createdAt: now,
        expiresAt,
      },
    }),
  );

  const { Item: inviteeProfile } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${inviteeEmail}`, sk: `PROFILE#${inviteeEmail}` },
    }),
  );

  if (inviteeProfile) {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${inviteeEmail}`,
          sk: `PENDING_INVITE#${household.id}`,
          token,
          householdId: household.id,
          householdName: household.name,
          inviterName,
          createdAt: now,
          expiresAt,
        },
      }),
    );
  }

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: Resource.EmailIdentity.sender,
        Destination: { ToAddresses: [inviteeEmail] },
        Message: {
          Subject: { Data: `${inviterName} invited you to join ${household.name} on Budgify`, Charset: "UTF-8" },
          Body: {
            Html: {
              Data: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">You've been invited to Budgify!</h2>
                  <p>Hello,</p>
                  <p><strong>${inviterName}</strong> has invited you to join their household <strong>${household.name}</strong> on Budgify — a smart budgeting app for families.</p>
                  <p>Your financial history has already been set up for you. Once you join, it will be linked to your new account.</p>
                  <p style="margin: 30px 0;">
                    <a href="${joinLink}" style="background-color: #a8471f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Join ${household.name}</a>
                  </p>
                  <p><strong>This invite expires in 7 days.</strong></p>
                  <p>If you don't have a Budgify account yet, you'll be prompted to create one when you click the link above.</p>
                  <p>If you did not expect this invitation, you can safely ignore this email.</p>
                </div>
              `,
              Charset: "UTF-8",
            },
          },
        },
      }),
    );
  } catch (emailError) {
    console.error("Failed to send non-user invite email:", emailError);
    if (process.env.NODE_ENV !== "production") {
      return {};
    }
    await Promise.all([
      docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `HOUSEHOLD_INVITE#${token}`, sk: "HOUSEHOLD_INVITE" } })),
      docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `HOUSEHOLD#${household.id}`, sk: `INVITE#${token}` } })),
      inviteeProfile
        ? docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `USER#${inviteeEmail}`, sk: `PENDING_INVITE#${household.id}` } }))
        : Promise.resolve(),
    ]);
    return { error: "Failed to send invite email. Please try again." };
  }

  revalidatePath("/dashboard/settings/household");
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function cancelHouseholdInvite(token: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const { household } = await getHousehold();
  if (!household || household.masterUserId !== session.user.id) {
    return { error: "Only the household admin can cancel invites." };
  }

  const { Item: invite } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `HOUSEHOLD_INVITE#${token}`, sk: "HOUSEHOLD_INVITE" },
    }),
  );
  if (!invite) return { error: "Invite not found." };

  const email = invite.email as string;

  await Promise.all([
    docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `HOUSEHOLD_INVITE#${token}`, sk: "HOUSEHOLD_INVITE" } })),
    docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `HOUSEHOLD#${household.id}`, sk: `INVITE#${token}` } })),
    docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: `USER#${email}`, sk: `PENDING_INVITE#${household.id}` } })),
  ]);

  revalidatePath("/dashboard/settings/household");
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function acceptHouseholdInvite(token: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" };

  const { Item: invite } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `HOUSEHOLD_INVITE#${token}`, sk: "HOUSEHOLD_INVITE" },
    }),
  );

  if (!invite) return { error: "Invite not found or already used." };
  if (invite.status !== "PENDING") return { error: "This invite has already been used." };
  if (new Date(invite.expiresAt as string) < new Date()) return { error: "This invite has expired." };
  if ((invite.email as string).toLowerCase() !== session.user.email.toLowerCase()) {
    return { error: "This invite was sent to a different email address." };
  }

  const householdId = invite.householdId as string;
  const now = new Date().toISOString();

  // Check user doesn't already have a household
  const existingLink = await docClient.send(
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
  if (existingLink.Items && existingLink.Items.length > 0) {
    return { error: "You are already part of a household." };
  }

  // Add member to household
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HOUSEHOLD#${householdId}`,
        sk: `MEMBER#${session.user.id}`,
        id: session.user.id,
        name: session.user.name ?? session.user.email,
        email: session.user.email,
        role: "MEMBER",
        canViewHousehold: false,
        createdAt: now,
      },
    }),
  );

  // Link user to household
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

  // Mark invite as accepted and clean up in-app notification
  await Promise.all([
    docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `HOUSEHOLD_INVITE#${token}`, sk: "HOUSEHOLD_INVITE" },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "ACCEPTED" },
      }),
    ),
    docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `HOUSEHOLD#${householdId}`, sk: `INVITE#${token}` },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "ACCEPTED" },
      }),
    ),
    docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${session.user.email}`, sk: `PENDING_INVITE#${householdId}` },
      }),
    ),
  ]);

  // If this invite was for a non-user member, re-key their historical data
  const nonUserId = invite.nonUserId as string | undefined;
  if (nonUserId) {
    const realId = session.user.id;

    // Re-key all data from USER#NONUSER_<uuid> → USER#<real-id>
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": `USER#${nonUserId}` },
          ExclusiveStartKey: lastKey,
        }),
      );
      const items = result.Items ?? [];
      for (let i = 0; i < items.length; i += 25) {
        const chunk = items.slice(i, i + 25);
        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE_NAME]: [
                // Write each item under the new real user ID
                ...chunk.map((item) => ({
                  PutRequest: {
                    Item: { ...item, pk: `USER#${realId}` },
                  },
                })),
                // Delete the originals
                ...chunk.map((item) => ({
                  DeleteRequest: {
                    Key: { pk: item.pk as string, sk: item.sk as string },
                  },
                })),
              ],
            },
          }),
        );
      }
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    // Remove the old NONUSER member record from the household
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `HOUSEHOLD#${householdId}`,
          sk: `MEMBER#${nonUserId}`,
        },
      }),
    );
  }

  revalidatePath("/dashboard/settings/household");
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function declineHouseholdInvite(token: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" };

  const { Item: invite } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `HOUSEHOLD_INVITE#${token}`, sk: "HOUSEHOLD_INVITE" },
    }),
  );

  if (!invite) return { error: "Invite not found." };
  if ((invite.email as string).toLowerCase() !== session.user.email.toLowerCase()) {
    return { error: "This invite was sent to a different email address." };
  }

  const householdId = invite.householdId as string;

  await Promise.all([
    docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `HOUSEHOLD_INVITE#${token}`, sk: "HOUSEHOLD_INVITE" },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "DECLINED" },
      }),
    ),
    docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `HOUSEHOLD#${householdId}`, sk: `INVITE#${token}` },
        UpdateExpression: "SET #s = :status",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":status": "DECLINED" },
      }),
    ),
    docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${session.user.email}`, sk: `PENDING_INVITE#${householdId}` },
      }),
    ),
  ]);

  revalidatePath("/dashboard/settings/household");
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function leaveHousehold(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" };

  const { household } = await getHousehold();
  if (!household) return { error: "You are not part of a household." };
  if (household.masterUserId === session.user.id) {
    return { error: "As the household admin, you cannot leave. Delete the household or transfer admin rights instead." };
  }

  await Promise.all([
    docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `HOUSEHOLD#${household.id}`, sk: `MEMBER#${session.user.id}` },
      }),
    ),
    docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${session.user.id}`, sk: `HOUSEHOLD_MEMBER#${household.id}` },
      }),
    ),
  ]);

  revalidatePath("/dashboard/settings/household");
  revalidatePath("/dashboard", "layout");
  return {};
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
    return { error: "Only the household admin can remove members." };
  }

  // Get member record to find their userId (needed for the user-side link removal)
  const { Item: memberRecord } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `HOUSEHOLD#${household.id}`, sk: `MEMBER#${memberId}` },
    }),
  );

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `HOUSEHOLD#${household.id}`,
        sk: `MEMBER#${memberId}`,
      },
    }),
  );

  const isNonUser = memberRecord?.isNonUser === true;

  if (!isNonUser) {
    // Remove the user-side link for real app users
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${memberId}`, sk: `HOUSEHOLD_MEMBER#${household.id}` },
      }),
    );

    if (deleteData) {
      await deletePartition(`USER#${memberId}`);
      if (memberRecord?.email) {
        await docClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { pk: `USER#${memberRecord.email}`, sk: `PROFILE#${memberRecord.email}` },
          }),
        );
      }
    }
  } else if (deleteData) {
    // Non-user: delete their data partition (transactions, accounts etc.) but no user auth records
    await deletePartition(`USER#${memberId}`);
  }

  revalidatePath("/dashboard/settings/household");
  revalidatePath("/dashboard", "layout");
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
    return { error: "Only the household admin can grant access." };
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
  revalidatePath("/dashboard", "layout");
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
    return { error: "Only the household admin can revoke access." };
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
  revalidatePath("/dashboard", "layout");
  return {};
}

// --- Household overview ---

export async function getHouseholdOverviewData(month: string): Promise<{
  error?: string;
  household?: Household;
  members?: HouseholdMember[];
  balance?: HouseholdMonthlyBalance;
  transactions?: HouseholdTransaction[];
}> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const isMaster = session.user.role === "MASTER";
  const canView = isMaster || session.user.canViewHousehold;
  if (!canView) return { error: "Access denied." };

  const { household, members } = await getHousehold();
  if (!household) return { error: "No household found." };

  const balance = await getHouseholdMonthlyBalance(members, month);

  if (isMaster) {
    const transactions = await getHouseholdMonthlyData(members, month);
    return { household, members, balance, transactions };
  }

  return { household, members, balance };
}

// --- Admin transfer / co-admin ---

export async function transferAdminRole(targetMemberId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const { household, members } = await getHousehold();
  if (!household) return { error: "No household found." };
  if (household.masterUserId !== session.user.id) {
    return { error: "Only the original admin can transfer admin role." };
  }

  const target = members.find((m) => m.id === targetMemberId);
  if (!target || target.isNonUser) return { error: "Invalid target member." };
  if (targetMemberId === session.user.id) return { error: "You are already the admin." };

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { pk: `HOUSEHOLD#${household.id}`, sk: `MEMBER#${targetMemberId}` },
            UpdateExpression: "SET #role = :master",
            ExpressionAttributeNames: { "#role": "role" },
            ExpressionAttributeValues: { ":master": "MASTER" },
          },
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { pk: `HOUSEHOLD#${household.id}`, sk: `MEMBER#${session.user.id}` },
            UpdateExpression: "SET #role = :member",
            ExpressionAttributeNames: { "#role": "role" },
            ExpressionAttributeValues: { ":member": "MEMBER" },
          },
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { pk: `USER#${targetMemberId}`, sk: `HOUSEHOLD_MEMBER#${household.id}` },
            UpdateExpression: "SET #role = :master",
            ExpressionAttributeNames: { "#role": "role" },
            ExpressionAttributeValues: { ":master": "MASTER" },
          },
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { pk: `USER#${session.user.id}`, sk: `HOUSEHOLD_MEMBER#${household.id}` },
            UpdateExpression: "SET #role = :member",
            ExpressionAttributeNames: { "#role": "role" },
            ExpressionAttributeValues: { ":member": "MEMBER" },
          },
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { pk: `HOUSEHOLD#${household.id}`, sk: "METADATA" },
            UpdateExpression: "SET masterUserId = :targetId",
            ExpressionAttributeValues: { ":targetId": targetMemberId },
          },
        },
      ],
    }),
  );

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/household");
  return {};
}

export async function addCoAdmin(targetMemberId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const { household, members } = await getHousehold();
  if (!household) return { error: "No household found." };
  if (household.masterUserId !== session.user.id) {
    return { error: "Only the original admin can grant co-admin status." };
  }

  const target = members.find((m) => m.id === targetMemberId);
  if (!target || target.isNonUser) return { error: "Invalid target member." };
  if (targetMemberId === session.user.id) return { error: "You are already the admin." };

  await Promise.all([
    docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `HOUSEHOLD#${household.id}`, sk: `MEMBER#${targetMemberId}` },
        UpdateExpression: "SET #role = :master",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":master": "MASTER" },
      }),
    ),
    docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${targetMemberId}`, sk: `HOUSEHOLD_MEMBER#${household.id}` },
        UpdateExpression: "SET #role = :master",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":master": "MASTER" },
      }),
    ),
  ]);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/household");
  return {};
}

export async function revokeCoAdmin(targetMemberId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const { household, members } = await getHousehold();
  if (!household) return { error: "No household found." };
  if (household.masterUserId !== session.user.id) {
    return { error: "Only the original admin can revoke co-admin status." };
  }
  if (targetMemberId === session.user.id) return { error: "Cannot revoke your own admin status." };

  const target = members.find((m) => m.id === targetMemberId);
  if (!target) return { error: "Member not found." };

  await Promise.all([
    docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `HOUSEHOLD#${household.id}`, sk: `MEMBER#${targetMemberId}` },
        UpdateExpression: "SET #role = :member",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":member": "MEMBER" },
      }),
    ),
    docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${targetMemberId}`, sk: `HOUSEHOLD_MEMBER#${household.id}` },
        UpdateExpression: "SET #role = :member",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":member": "MEMBER" },
      }),
    ),
  ]);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/household");
  return {};
}
