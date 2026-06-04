"use server";

import {
  QueryCommand,
  PutCommand,
  BatchWriteCommand,
  DeleteCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "@/lib/db";
import { auth } from "@/auth";
import {
  transactionSchema,
  TransactionInput,
} from "@/lib/validations/transaction";
import { revalidatePath } from "next/cache";
import { fuzzyMatch, extractMerchant } from "@/lib/transactionUtils";
import { Transaction } from "@/lib/data/budget";

async function fetchAllTxItems(
  userId: string,
  filterExpression?: string,
  filterNames?: Record<string, string>,
  filterValues?: Record<string, string>,
): Promise<Transaction[]> {
  const items: Transaction[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeNames: filterNames,
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":skPrefix": "TX#",
          ...filterValues,
        },
        FilterExpression: filterExpression,
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      }),
    );
    if (response.Items) items.push(...(response.Items as Transaction[]));
    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return items;
}

export async function createTransaction(data: TransactionInput) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid transaction data." };

  const { description, amount, date, category, transactionType, accountId } =
    parsed.data;
  const txId = crypto.randomUUID();
  const seq = Date.now().toString().padStart(13, "0");

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${userId}`,
          sk: `TX#${date}#${seq}#${txId}`,
          id: txId,
          type: "TRANSACTION",
          description,
          amount: Number(amount),
          date,
          category,
          transactionType,
          accountId: accountId ?? null,
          addedByUserId: userId,
          importOrder: Date.now(),
          createdAt: new Date().toISOString(),
        },
      }),
    );
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return { error: "Database error." };
  }
}

export async function batchCreateTransactions(
  transactions: TransactionInput[],
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const validTransactions = transactions.filter(
    (tx) => transactionSchema.safeParse(tx).success,
  );
  if (validTransactions.length === 0)
    return { error: "No valid transactions found." };

  const batchBase = Date.now();
  const putRequests = validTransactions.map((tx, index) => {
    const txId = crypto.randomUUID();
    const seq = (batchBase + index).toString().padStart(13, "0");
    return {
      PutRequest: {
        Item: {
          pk: `USER#${userId}`,
          sk: `TX#${tx.date}#${seq}#${txId}`,
          id: txId,
          type: "TRANSACTION",
          description: tx.description,
          amount: Number(tx.amount),
          date: tx.date,
          category: tx.category,
          transactionType: tx.transactionType ?? "EXPENSE",
          accountId: tx.accountId ?? null,
          addedByUserId: userId,
          importOrder: batchBase + index,
          createdAt: new Date().toISOString(),
        },
      },
    };
  });

  const chunkSize = 25;
  const batches: (typeof putRequests)[] = [];
  for (let i = 0; i < putRequests.length; i += chunkSize) {
    batches.push(putRequests.slice(i, i + chunkSize));
  }

  try {
    await Promise.all(
      batches.map((batch) =>
        docClient.send(
          new BatchWriteCommand({
            RequestItems: { [TABLE_NAME]: batch },
          }),
        ),
      ),
    );
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true, count: validTransactions.length };
  } catch (error) {
    console.error("Failed to batch write transactions:", error);
    return { error: "Failed to process bulk upload." };
  }
}

export async function getTransactions(month?: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  const skPrefix = month ? `TX#${month}` : "TX#";

  try {
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":skPrefix": skPrefix,
        },
        ScanIndexForward: false,
      }),
    );
    return { success: true, transactions: Items ?? [] };
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return { error: "Failed to retrieve financial data." };
  }
}

export async function getTransactionsByMonth(
  month: string,
): Promise<{ transactions: Transaction[] }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  try {
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":skPrefix": `TX#${month}`,
        },
        ScanIndexForward: false,
      }),
    );
    /* v8 ignore next */
    return { transactions: (Items ?? []) as Transaction[] };
  } catch (error) {
    console.error("Failed to fetch transactions by month:", error);
    throw new Error("Failed to retrieve transactions.");
  }
}

export async function getTransactionsBatch(
  cursor?: string,
  limit: number = 25,
): Promise<{ transactions: Transaction[]; nextCursor: string | null }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const safeLimit = Math.min(limit, 100);
  const exclusiveStartKey = cursor
    ? JSON.parse(Buffer.from(cursor, "base64url").toString())
    : undefined;

  try {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":skPrefix": "TX#",
        },
        ScanIndexForward: false,
        Limit: safeLimit,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    const nextCursor = response.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString(
          "base64url",
        )
      : null;

    return {
      /* v8 ignore next */
      transactions: (response.Items ?? []) as Transaction[],
      nextCursor,
    };
  } catch (error) {
    console.error("Failed to fetch transaction batch:", error);
    throw new Error("Failed to retrieve transactions.");
  }
}

export async function getAllTransactions() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  try {
    const transactions = await fetchAllTxItems(userId);
    return { success: true, transactions };
  } catch (error) {
    console.error("Failed to fetch all transactions:", error);
    return { error: "Failed to retrieve financial data." };
  }
}

export async function getAvailableMonths(): Promise<string[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const months = new Set<string>();
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":skPrefix": "TX#",
        },
        ProjectionExpression: "sk",
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );
    /* v8 ignore next */
    for (const item of response.Items ?? []) {
      const sk = (item as { sk: string }).sk;
      const match = sk.match(/^TX#(\d{4}-\d{2})/);
      if (match) months.add(match[1]);
    }
    lastEvaluatedKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastEvaluatedKey);

  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

export async function countTransactionsByDescription(
  description: string,
  transactionType: "EXPENSE" | "INCOME",
): Promise<{ count?: number; error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Unauthorized" };

  const merchantKey = extractMerchant(description);

  try {
    const transactions = await fetchAllTxItems(userId);

    const count = transactions.filter(
      (tx) =>
        tx.description !== undefined &&
        extractMerchant(tx.description) === merchantKey &&
        tx.transactionType === transactionType,
    ).length;

    return { count };
  } catch (error) {
    console.error("Failed to count transactions:", error);
    return { error: "Failed to count transactions." };
  }
}

export async function recategorizeByDescription(
  description: string,
  categoryName: string,
  transactionType: "EXPENSE" | "INCOME",
): Promise<{ success?: boolean; count?: number; error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Unauthorized" };

  const merchantKey = extractMerchant(description);

  try {
    const transactions = await fetchAllTxItems(userId);

    const matches = transactions.filter(
      (tx) =>
        tx.description !== undefined &&
        extractMerchant(tx.description) === merchantKey &&
        tx.transactionType === transactionType,
    );

    if (matches.length === 0) return { success: true, count: 0 };

    const putRequests = matches.map((tx) => ({
      PutRequest: {
        Item: { ...tx, category: categoryName },
      },
    }));

    for (let i = 0; i < putRequests.length; i += 25) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: { [TABLE_NAME]: putRequests.slice(i, i + 25) },
        }),
      );
    }

    return { success: true, count: matches.length };
  } catch (error) {
    console.error("Failed to recategorize transactions:", error);
    return { error: "Failed to recategorize transactions." };
  }
}

export async function deleteTransaction(date: string, txId: string, sk?: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Unauthorized" };

  const sortKey = sk ?? `TX#${date}#${txId}`;

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `USER#${userId}`,
          sk: sortKey,
        },
      }),
    );
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    console.error("[DB] Failed to delete transaction:", error);
    return { error: "Failed to delete transaction" };
  }
}

export async function batchDeleteTransactions(
  items: { date: string; id: string; sk?: string }[],
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Unauthorized" };

  try {
    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25);
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: chunk.map(({ date, id, sk }) => ({
              DeleteRequest: {
                Key: { pk: `USER#${userId}`, sk: sk ?? `TX#${date}#${id}` },
              },
            })),
          },
        }),
      );
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true, count: items.length };
  } catch (error) {
    console.error("[DB] Failed to batch delete transactions:", error);
    return { error: "Failed to delete transactions" };
  }
}

export async function deleteAllTransactions() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { error: "Unauthorized" }

  try {
    const allResult = await getAllTransactions()
    if ("error" in allResult) return { error: allResult.error }

    const items = allResult.transactions.map((tx) => ({
      sk: tx.sk as string,
    }))

    if (items.length === 0) return { success: true, count: 0 }

    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25)
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: chunk.map(({ sk }) => ({
              DeleteRequest: {
                Key: { pk: `USER#${userId}`, sk },
              },
            })),
          },
        }),
      )
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/transactions")
    return { success: true, count: items.length }
  } catch (error) {
    console.error("[DB] Failed to delete all transactions:", error)
    return { error: "Failed to delete all transactions" }
  }
}

export type DuplicateCheckInput = {
  rowId: number;
  date: string;
  amount: number;
  description: string;
};

export type DuplicateCheckResult = {
  duplicateRowIds: number[];
  error?: never;
} | {
  duplicateRowIds?: never;
  error: string;
};


export async function checkDuplicates(
  inputs: DuplicateCheckInput[],
): Promise<DuplicateCheckResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Unauthorized" };

  // Group incoming rows by date so we issue one DynamoDB query per unique date
  const byDate = new Map<string, DuplicateCheckInput[]>();
  for (const row of inputs) {
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }

  const duplicateRowIds: number[] = [];

  try {
    for (const [date, rows] of byDate) {
      // Cheap range query — only fetches transactions on this exact date
      let lastEvaluatedKey: Record<string, unknown> | undefined;
      const existing: { description: string; amount: number }[] = [];

      do {
        const response = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
            ExpressionAttributeValues: {
              ":pk": `USER#${userId}`,
              ":skPrefix": `TX#${date}`,
            },
            ProjectionExpression: "description, amount",
            ExclusiveStartKey: lastEvaluatedKey,
          }),
        );
        /* v8 ignore next */
        for (const item of response.Items ?? []) {
          existing.push(item as { description: string; amount: number });
        }
        lastEvaluatedKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (lastEvaluatedKey);

      for (const row of rows) {
        const amt = Number(row.amount);
        const isDup = existing.some(
          (ex) => ex.amount === amt && fuzzyMatch(ex.description, row.description),
        );
        if (isDup) {
          duplicateRowIds.push(row.rowId);
        } else {
          // Track this row so later rows in the same batch are checked against it too
          existing.push({ description: row.description, amount: amt });
        }
      }
    }

    return { duplicateRowIds };
  } catch (error) {
    console.error("Failed to check duplicates:", error);
    return { error: "Failed to check for duplicate transactions." };
  }
}

export async function updateTransaction(
  originalDate: string,
  txId: string,
  data: TransactionInput,
  originalSk?: string,
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Unauthorized" };

  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid transaction data." };

  const { description, amount, date, category, transactionType, accountId } =
    parsed.data;

  const updateSeq = Date.now().toString().padStart(13, "0");

  const originalSkResolved = originalSk ?? `TX#${originalDate}#${txId}`;

  try {
    // If date changed, we must replace the item since SK changes
    if (originalDate !== date) {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Delete: {
                TableName: TABLE_NAME,
                Key: {
                  pk: `USER#${userId}`,
                  sk: originalSkResolved,
                },
              },
            },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: {
                  pk: `USER#${userId}`,
                  sk: `TX#${date}#${updateSeq}#${txId}`,
                  id: txId,
                  type: "TRANSACTION",
                  description,
                  amount: Number(amount),
                  date,
                  category,
                  transactionType,
                  accountId: accountId ?? null,
                  addedByUserId: userId,
                  importOrder: Date.now(),
                  createdAt: new Date().toISOString(),
                },
              },
            },
          ],
        }),
      );
    } else {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            pk: `USER#${userId}`,
            sk: originalSkResolved,
            id: txId,
            type: "TRANSACTION",
            description,
            amount: Number(amount),
            date,
            category,
            transactionType,
            accountId: accountId ?? null,
            addedByUserId: userId,
            importOrder: Date.now(),
            createdAt: new Date().toISOString(),
          },
        }),
      );
    }

    return { success: true };
  } catch (error) {
    console.error("[DB] Failed to update transaction:", error);
    return { error: "Failed to update transaction" };
  }
}
