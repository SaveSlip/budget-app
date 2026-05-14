import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/db";
import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

/**
 * Returns the effective user ID for data scoping.
 * If the session master has switched to a household member, validates
 * the switch is authorized and returns the member's ID.
 * Otherwise returns the session user's own ID.
 */
export async function getActiveUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const ownId = session.user.id;
  const activeId = session.user.activeUserId ?? ownId;

  if (activeId === ownId) return ownId;

  // Verify the session user is the master of a household containing activeId
  const linkResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${ownId}`,
        ":prefix": "HOUSEHOLD_MEMBER#",
      },
      Limit: 1,
    }),
  );

  const link = linkResult.Items?.[0];
  if (!link || link.role !== "MASTER") return ownId;

  const memberResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `HOUSEHOLD#${link.householdId}`,
        sk: `MEMBER#${activeId}`,
      },
    }),
  );

  return memberResult.Item ? activeId : ownId;
}
