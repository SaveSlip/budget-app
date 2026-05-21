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


import { z } from "zod";
import { UNIVERSAL_CATEGORIES, UNIVERSAL_INCOME_CATEGORIES, findUniversalCategory } from "@/lib/constants/categories";

const limitSchema = z.coerce.number().nonnegative("Limit must be 0 or greater");

export async function createCategory(data: { name: string; limit: number; categoryType?: "INCOME" | "EXPENSE" }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };


  const categoryType = data.categoryType ?? "EXPENSE";
  const trimmedName = data.name.trim();

  if (categoryType === "INCOME") {
    const incomeMatch = UNIVERSAL_INCOME_CATEGORIES.find(
      (uc) => uc.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (incomeMatch) {
      return { error: "universal", universalName: incomeMatch.name };
    }
  } else {
    const match = findUniversalCategory(trimmedName);
    if (match) {
      return { error: "universal", universalName: match.name };
    }
  }

  const existing = await listCategories();
  if (existing.categories) {
    const duplicate = existing.categories.find(
      (c: { name: string }) => c.name.toLowerCase() === trimmedName.toLowerCase()
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
          name: trimmedName,
          type: "CATEGORY",
          categoryType,
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


  try {
    const [{ Items }, { Items: limitItems }] = await Promise.all([
      docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${session.user.id}`,
            ":sk": "CATEGORY#",
          },
        }),
      ),
      docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${session.user.id}`,
            ":sk": "UNIVERSAL_LIMIT#",
          },
        }),
      ),
    ]);

    const customCategories = (Items ?? []) as Array<{ id: string; name: string; limit: number; type: string; createdAt: string; categoryType?: "INCOME" | "EXPENSE" }>;
    const universalLimitOverrides = new Map<string, number>(
      (limitItems ?? []).map((item) => [item.id as string, item.limit as number])
    );

    const universalExpenseCategories = UNIVERSAL_CATEGORIES.map((uc) => ({
      id: uc.id,
      name: uc.name,
      limit: universalLimitOverrides.get(uc.id) ?? 0,
      type: "CATEGORY",
      createdAt: "",
      isUniversal: true,
      categoryType: "EXPENSE" as const,
    }));

    const universalIncomeCategories = UNIVERSAL_INCOME_CATEGORIES.map((uc) => ({
      id: uc.id,
      name: uc.name,
      limit: 0,
      type: "CATEGORY",
      createdAt: "",
      isUniversal: true,
      categoryType: "INCOME" as const,
    }));

    // Merge: universal categories first, then custom (skip any custom whose name matches a universal)
    const universalNames = new Set([
      ...UNIVERSAL_CATEGORIES.map((uc) => uc.name.toLowerCase()),
      ...UNIVERSAL_INCOME_CATEGORIES.map((uc) => uc.name.toLowerCase()),
    ]);
    const filteredCustom = customCategories.filter(
      (c) => !universalNames.has(c.name.toLowerCase())
    );

    return {
      success: true,
      categories: [
        ...universalExpenseCategories,
        ...universalIncomeCategories,
        ...filteredCustom.map((c) => ({ ...c, isUniversal: false, categoryType: (c.categoryType ?? "EXPENSE") as "INCOME" | "EXPENSE" })),
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

export async function saveOnboardingLimits(limits: Record<string, number>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const validIds = new Set(UNIVERSAL_CATEGORIES.map((uc) => uc.id));
  const entries = Object.entries(limits).filter(
    ([id, val]) => validIds.has(id) && val > 0
  );

  try {
    await Promise.all(
      entries.map(([id, limit]) =>
        docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              pk: `USER#${session.user.id}`,
              sk: `UNIVERSAL_LIMIT#${id}`,
              id,
              limit,
              updatedAt: new Date().toISOString(),
            },
          }),
        ),
      ),
    );

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[DB] Failed to save onboarding limits:", error);
    return { error: "Failed to save limits" };
  }
}

export async function updateUniversalCategoryLimit(id: string, limit: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (!UNIVERSAL_CATEGORIES.some((uc) => uc.id === id)) {
    return { error: "Not a universal category" };
  }

  const parsed = limitSchema.safeParse(limit);
  if (!parsed.success) return { error: "Invalid limit value" };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${session.user.id}`,
          sk: `UNIVERSAL_LIMIT#${id}`,
          id,
          limit: parsed.data,
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[DB] Failed to update universal category limit:", error);
    return { error: "Failed to update limit" };
  }
}

export async function updateCategory(
  id: string,
  data: { name: string; limit: number },
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };


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
