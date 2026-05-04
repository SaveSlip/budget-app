"use server";

import { docClient, TABLE_NAME } from "@/lib/db";
import { PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { z } from "zod";

const limitSchema = z.coerce.number().nonnegative("Limit must be 0 or greater");

export async function createCategory(data: { name: string; limit: number }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const categoryId = crypto.randomUUID();

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${session.user.id}`,
          sk: `CATEGORY#${categoryId}`,
          id: categoryId,
          name: data.name,
          type: "CATEGORY",
          limit: data.limit ?? 0,
          count: 0,
          createdAt: new Date().toISOString(),
        },
      }),
    );

    revalidatePath("/dashboard/settings/categories");
    return { success: true, id: categoryId };
  } catch (error) {
    console.error("[DB] Failed to create category:", error);
    return { error: "Failed to create category" };
  }
}

export async function deleteCategory(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `USER#${session.user.id}`,
          sk: `CATEGORY#${id}`,
        },
      }),
    );

    revalidatePath("/dashboard/settings/categories");
    return { success: true };
  } catch (error) {
    console.error("[DB] Failed to delete category:", error);
    return { error: "Failed to delete category" };
  }
}

export async function listCategories() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${session.user.id}`,
          ":sk": "CATEGORY#",
        },
      }),
    );
    return { success: true, categories: Items ?? [] };
  } catch (error) {
    console.error("[DB] Failed to list categories:", error);
    return { error: "Failed to retrieve categories", categories: [] };
  }
}

export async function updateCategoryLimit(id: string, limit: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = limitSchema.safeParse(limit);
  if (!parsed.success) return { error: "Invalid limit value" };

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `USER#${session.user.id}`,
          sk: `CATEGORY#${id}`,
        },
        UpdateExpression: "SET #limit = :limit",
        ExpressionAttributeNames: {
          "#limit": "limit",
        },
        ExpressionAttributeValues: {
          ":limit": parsed.data,
        },
      }),
    );

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[DB] Failed to update category limit:", error);
    return { error: "Failed to update limit" };
  }
}
