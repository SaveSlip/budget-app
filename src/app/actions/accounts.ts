"use server";

import {
  QueryCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { auth } from "@/auth";

import { docClient, TABLE_NAME } from "@/lib/db";
import { accountSchema, AccountInput } from "@/lib/validations/account";
import { revalidatePath } from "next/cache";

export async function createAccount(data: AccountInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };


  const parsed = accountSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid account data." };

  const { name, type, initialBalance } = parsed.data;
  const userId = session.user.id;
  const accountId = crypto.randomUUID();

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${userId}`,
          sk: `ACCOUNT#${accountId}`,
          id: accountId,
          type: "ACCOUNT",
          name,
          accountType: type,
          initialBalance: Number(initialBalance),
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    revalidatePath("/dashboard");
    return { success: true, id: accountId };
  } catch (error) {
    console.error("Failed to create account:", error);
    return { error: "Failed to create account." };
  }
}

export async function listAccounts() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };


  const userId = session.user.id;

  try {
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":skPrefix": "ACCOUNT#",
        },
      }),
    );
    return { success: true, accounts: Items ?? [] };
  } catch (error) {
    console.error("Failed to list accounts:", error);
    return { error: "Failed to retrieve accounts." };
  }
}

export async function deleteAccount(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };


  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `USER#${session.user.id}`,
          sk: `ACCOUNT#${accountId}`,
        },
      }),
    );
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { error: "Failed to delete account." };
  }
}
