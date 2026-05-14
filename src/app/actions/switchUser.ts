"use server";

import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/db";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

/**
 * Validates that the current session user is the master of the household
 * that contains the target memberId before switching.
 */
export async function validateUserSwitch(
  targetMemberId: string,
): Promise<{ error?: string; allowed?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Switching back to self is always allowed
  if (targetMemberId === session.user.id) return { allowed: true };

  // Find the user's household
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
  if (!link || link.role !== "MASTER") {
    return { error: "Only the household master can switch users." };
  }

  const householdId = link.householdId as string;

  // Verify the target member belongs to this household
  const memberResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `HOUSEHOLD#${householdId}`,
        sk: `MEMBER#${targetMemberId}`,
      },
    }),
  );

  if (!memberResult.Item) {
    return { error: "Member not found in your household." };
  }

  return { allowed: true };
}
