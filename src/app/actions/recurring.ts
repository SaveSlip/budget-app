"use server";

import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/db";
import {
  PutCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import {
  recurringTransactionSchema,
  type RecurringTransactionInput,
} from "@/lib/validations/recurring";
import type { RecurringTransaction } from "@/lib/data/budget";

async function computeNextRunDate(
  frequency: RecurringTransactionInput["frequency"],
  dayOfMonth?: number,
  from?: Date,
): Promise<string> {
  const base = from ?? new Date();
  const d = new Date(base);

  switch (frequency) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      break;
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      break;
    case "MONTHLY": {
      d.setMonth(d.getMonth() + 1);
      if (dayOfMonth) {
        d.setDate(Math.min(dayOfMonth, 28));
      }
      break;
    }
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }

  return d.toISOString().split("T")[0];
}

async function initialNextRunDate(
  frequency: RecurringTransactionInput["frequency"],
  dayOfMonth?: number,
): Promise<string> {
  const today = new Date();

  if (frequency === "MONTHLY" && dayOfMonth) {
    const target = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    if (target <= today) {
      target.setMonth(target.getMonth() + 1);
    }
    return target.toISOString().split("T")[0];
  }

  return computeNextRunDate(frequency, dayOfMonth, today);
}

export async function createRecurringTransaction(
  data: RecurringTransactionInput,
): Promise<{ error?: string; id?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = recurringTransactionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    description,
    amount,
    category,
    transactionType,
    accountId,
    frequency,
    dayOfMonth,
    isActive,
  } = parsed.data;

  const id = randomUUID();
  const nextRunDate = initialNextRunDate(frequency, dayOfMonth);

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `USER#${session.user.id}`,
        sk: `RECURRING#${id}`,
        id,
        type: "RECURRING",
        description,
        amount: Number(amount),
        category,
        transactionType,
        accountId,
        frequency,
        dayOfMonth,
        nextRunDate,
        isActive,
        createdAt: new Date().toISOString(),
      },
    }),
  );

  revalidatePath("/dashboard/settings/recurring");
  return { id };
}

export async function listRecurringTransactions(): Promise<
  RecurringTransaction[]
> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${session.user.id}`,
        ":skPrefix": "RECURRING#",
      },
    }),
  );

  return (result.Items ?? []) as RecurringTransaction[];
}

export async function updateRecurringTransaction(
  id: string,
  data: RecurringTransactionInput,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = recurringTransactionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    description,
    amount,
    category,
    transactionType,
    accountId,
    frequency,
    dayOfMonth,
    isActive,
  } = parsed.data;

  const nextRunDate = initialNextRunDate(frequency, dayOfMonth);

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `USER#${session.user.id}`,
        sk: `RECURRING#${id}`,
        id,
        type: "RECURRING",
        description,
        amount: Number(amount),
        category,
        transactionType,
        accountId,
        frequency,
        dayOfMonth,
        nextRunDate,
        isActive,
        createdAt: new Date().toISOString(),
      },
    }),
  );

  revalidatePath("/dashboard/settings/recurring");
  return {};
}

export async function deleteRecurringTransaction(
  id: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `USER#${session.user.id}`,
        sk: `RECURRING#${id}`,
      },
    }),
  );

  revalidatePath("/dashboard/settings/recurring");
  return {};
}

export async function toggleRecurringTransaction(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `USER#${session.user.id}`,
        sk: `RECURRING#${id}`,
      },
      UpdateExpression: "SET isActive = :isActive",
      ExpressionAttributeValues: {
        ":isActive": isActive,
      },
    }),
  );

  revalidatePath("/dashboard/settings/recurring");
  return {};
}
