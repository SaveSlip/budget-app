import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/db";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export interface Category {
  id: string;
  name: string;
  limit: number;
  type: string;
  createdAt: string;
}

export interface Transaction {
  pk: string;
  sk: string;
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: string;
  createdAt: string;
}

export async function getMonthlyData(month: string): Promise<Transaction[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${session.user.id}`,
          ":skPrefix": `TX#${month}`,
        },
        ScanIndexForward: false,
      }),
    );
    return (result.Items ?? []) as Transaction[];
  } catch (error) {
    console.error("[DAL] Monthly data fetch failed:", error);
    return [];
  }
}

export async function getCategories(): Promise<Category[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${session.user.id}`,
          ":skPrefix": "CATEGORY#",
        },
      }),
    );
    return (result.Items ?? []) as Category[];
  } catch (error) {
    console.error("[DAL] Categories fetch failed:", error);
    return [];
  }
}

export async function getTransactionTrend(
  monthsBack: number = 6,
): Promise<Transaction[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "UserDateIndex",
        KeyConditionExpression:
          "userId = :uid AND #date BETWEEN :start AND :end",
        ExpressionAttributeNames: {
          "#date": "date",
        },
        ExpressionAttributeValues: {
          ":uid": session.user.id,
          ":start": startDate.toISOString().split("T")[0],
          ":end": endDate.toISOString().split("T")[0],
        },
      }),
    );
    return (result.Items ?? []) as Transaction[];
  } catch (error) {
    console.error("[DAL] Trend fetch failed:", error);
    return [];
  }
}
