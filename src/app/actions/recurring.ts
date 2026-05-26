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

function lastDayOf(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function setDayOfMonthClamped(d: Date, day: number): void {
  const max = lastDayOf(d.getFullYear(), d.getMonth());
  d.setDate(Math.min(day, max));
}

function nextWeekday(from: Date, targetDow: number): Date {
  const d = new Date(from);
  const diff = (targetDow - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

async function computeNextRunDate(
  frequency: RecurringTransactionInput["frequency"],
  opts: {
    dayOfMonth?: number;
    dayOfWeek?: number;
    monthOfYear?: number;
    dayOfYear?: number;
  },
  from?: Date,
): Promise<string> {
  const base = from ?? new Date();
  const d = new Date(base);

  switch (frequency) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      break;
    case "WEEKLY":
      if (opts.dayOfWeek !== undefined) {
        const next = nextWeekday(d, opts.dayOfWeek);
        return next.toISOString().split("T")[0];
      }
      d.setDate(d.getDate() + 7);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      if (opts.dayOfMonth) setDayOfMonthClamped(d, opts.dayOfMonth);
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      if (opts.monthOfYear) {
        d.setMonth(opts.monthOfYear - 1);
        setDayOfMonthClamped(d, opts.dayOfYear ?? d.getDate());
      }
      break;
  }

  return d.toISOString().split("T")[0];
}

async function initialNextRunDate(
  frequency: RecurringTransactionInput["frequency"],
  opts: {
    dayOfMonth?: number;
    dayOfWeek?: number;
    monthOfYear?: number;
    dayOfYear?: number;
  },
): Promise<string> {
  const today = new Date();

  if (frequency === "MONTHLY" && opts.dayOfMonth) {
    const target = new Date(today.getFullYear(), today.getMonth(), 1);
    setDayOfMonthClamped(target, opts.dayOfMonth);
    if (target <= today) target.setMonth(target.getMonth() + 1);
    setDayOfMonthClamped(target, opts.dayOfMonth);
    return target.toISOString().split("T")[0];
  }

  if (frequency === "WEEKLY" && opts.dayOfWeek !== undefined) {
    return nextWeekday(today, opts.dayOfWeek).toISOString().split("T")[0];
  }

  if (frequency === "YEARLY" && opts.monthOfYear) {
    const target = new Date(today.getFullYear(), opts.monthOfYear - 1, 1);
    setDayOfMonthClamped(target, opts.dayOfYear ?? 1);
    if (target <= today) {
      target.setFullYear(target.getFullYear() + 1);
      target.setMonth(opts.monthOfYear - 1);
      setDayOfMonthClamped(target, opts.dayOfYear ?? 1);
    }
    return target.toISOString().split("T")[0];
  }

  return computeNextRunDate(frequency, opts, today);
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
    dayOfWeek,
    monthOfYear,
    dayOfYear,
    isActive,
  } = parsed.data;

  const id = randomUUID();
  const nextRunDate = await initialNextRunDate(frequency, { dayOfMonth, dayOfWeek, monthOfYear, dayOfYear });

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
        dayOfWeek,
        monthOfYear,
        dayOfYear,
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

  return (result.Items ?? []).map((item) => ({
    ...item,
    nextRunDate: typeof item.nextRunDate === "string" ? item.nextRunDate : "—",
  })) as RecurringTransaction[];
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
    dayOfWeek,
    monthOfYear,
    dayOfYear,
    isActive,
  } = parsed.data;

  const nextRunDate = await initialNextRunDate(frequency, { dayOfMonth, dayOfWeek, monthOfYear, dayOfYear });

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
        dayOfWeek,
        monthOfYear,
        dayOfYear,
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
