"use server";

import { docClient, TABLE_NAME } from "@/lib/db";
import {
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertAuthorized, ForbiddenError } from "@/lib/auth-guard";
import { z } from "zod";
import { UNIVERSAL_CATEGORIES, findUniversalCategory } from "@/lib/constants/categories";

const limitSchema = z.coerce.number().nonnegative("Limit must be 0 or greater");

export async function createCategory(data: { name: string; limit: number }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  const match = findUniversalCategory(data.name);
  if (match) {
    return { error: "universal", universalName: match.name };
  }

  const existing = await listCategories();
  if (existing.categories) {
    const duplicate = existing.categories.find(
      (c: { name: string }) => c.name.toLowerCase() === data.name.toLowerCase().trim()
    );
    if (duplicate) return { error: "duplicate" };
  }

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
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  if (UNIVERSAL_CATEGORIES.some((uc) => uc.id === id)) {
    return { error: "Cannot delete a universal category" };
  }

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
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

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

    const customCategories = (Items ?? []) as Array<{ id: string; name: string; limit: number; type: string; createdAt: string }>;

    const universalCategories = UNIVERSAL_CATEGORIES.map((uc) => ({
      id: uc.id,
      name: uc.name,
      limit: 0,
      type: "CATEGORY",
      createdAt: "",
      isUniversal: true,
    }));

    // Merge: universal categories first, then custom (skip any custom whose name matches a universal)
    const universalNames = new Set(UNIVERSAL_CATEGORIES.map((uc) => uc.name.toLowerCase()));
    const filteredCustom = customCategories.filter(
      (c) => !universalNames.has(c.name.toLowerCase())
    );

    return {
      success: true,
      categories: [
        ...universalCategories,
        ...filteredCustom.map((c) => ({ ...c, isUniversal: false })),
      ],
    };
  } catch (error) {
    console.error("[DB] Failed to list categories:", error);
    return { error: "Failed to retrieve categories", categories: [] };
  }
}

export async function updateCategoryLimit(id: string, limit: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

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

export async function updateCategory(
  id: string,
  data: { name: string; limit: number },
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  try { assertAuthorized(session, session.user.id); } catch (e) {
    if (e instanceof ForbiddenError) return e.toResponse();
    throw e;
  }

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `USER#${session.user.id}`,
          sk: `CATEGORY#${id}`,
        },
        UpdateExpression: "SET #name = :name, #limit = :limit",
        ExpressionAttributeNames: {
          "#name": "name",
          "#limit": "limit",
        },
        ExpressionAttributeValues: {
          ":name": data.name,
          ":limit": data.limit ?? 0,
        },
      }),
    );

    revalidatePath("/dashboard/settings/categories");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[DB] Failed to update category:", error);
    return { error: "Failed to update category" };
  }
}
