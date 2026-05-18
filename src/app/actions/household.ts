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
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";
import {
  createHouseholdSchema,
  inviteMemberSchema,
  type CreateHouseholdInput,
  type InviteMemberInput,
} from "@/lib/validations/household";
import type { Household, HouseholdMember, HouseholdInvite } from "@/lib/data/budget";

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

  const members = (membersResult.Items ?? []) as HouseholdMember[];
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

  revalidatePath("/dashboard/settings/household");
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

  // Check for an existing pending invite for this email
  const existingInviteResult = await docClient.send(
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
  if (existingInviteResult.Items && existingInviteResult.Items.length > 0) {
    return { error: "An invite has already been sent to this email." };
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

  // Check if the invitee is an existing app user
  const { Item: inviteeProfile } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${inviteeEmail}`, sk: `PROFILE#${inviteeEmail}` },
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

  revalidatePath("/dashboard/settings/household");
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

  // Remove the user-side link if this is a real app user
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
  return {};
}
