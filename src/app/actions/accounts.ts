"use server";

import {
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
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

  const { name, type, initialBalance, accountNumber } = parsed.data;
  const userId = session.user.id;
  const accountId = crypto.randomUUID();

  // Normalize account number: keep only last 4 digits if longer
  const normalizedAccountNumber = accountNumber
    ? accountNumber.replace(/\D/g, "").slice(-4) || accountNumber.trim() || undefined
    : undefined;

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
          ...(normalizedAccountNumber ? { accountNumber: normalizedAccountNumber } : {}),
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

export async function updateAccount(
  accountId: string,
  data: { name?: string; accountType?: string; accountNumber?: string },
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = session.user.id;
  const updates: string[] = [];
  const attrNames: Record<string, string> = {};
  const attrValues: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updates.push("#n = :name");
    attrNames["#n"] = "name";
    attrValues[":name"] = data.name;
  }
  if (data.accountType !== undefined) {
    updates.push("accountType = :accountType");
    attrValues[":accountType"] = data.accountType;
  }
  if (data.accountNumber !== undefined) {
    const normalized = data.accountNumber.replace(/\D/g, "").slice(-4) || data.accountNumber.trim();
    updates.push("accountNumber = :accountNumber");
    attrValues[":accountNumber"] = normalized;
  }

  if (updates.length === 0) return { error: "No fields to update." };

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${userId}`, sk: `ACCOUNT#${accountId}` },
        ConditionExpression: "attribute_exists(pk)",
        UpdateExpression: `SET ${updates.join(", ")}`,
        ExpressionAttributeNames: Object.keys(attrNames).length > 0 ? attrNames : undefined,
        ExpressionAttributeValues: attrValues,
      }),
    );
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to update account:", error);
    return { error: "Failed to update account." };
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
