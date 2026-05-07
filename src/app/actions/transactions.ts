"use server";

import { QueryCommand, PutCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/db";
import { transactionSchema, TransactionInput } from "@/lib/validations/transaction";
import { revalidatePath } from "next/cache";

export async function createTransaction(data: TransactionInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid transaction data." };

  const { description, amount, date, category } = parsed.data;
  const userId = session.user.id;
  const txId = crypto.randomUUID();

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `USER#${userId}`,
          sk: `TX#${date}#${txId}`,
          id: txId,
          type: "TRANSACTION",
          description,
          amount: Number(amount),
          date,
          category,
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

export async function batchCreateTransactions(transactions: TransactionInput[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const validTransactions = transactions.filter(
    (tx) => transactionSchema.safeParse(tx).success,
  );
  if (validTransactions.length === 0)
    return { error: "No valid transactions found." };

  const putRequests = validTransactions.map((tx) => {
    const txId = crypto.randomUUID();
    return {
      PutRequest: {
        Item: {
          pk: `USER#${userId}`,
          sk: `TX#${tx.date}#${txId}`,
          id: txId,
          type: "TRANSACTION",
          description: tx.description,
          amount: Number(tx.amount),
          date: tx.date,
          category: tx.category,
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
    return { success: true, count: validTransactions.length };
  } catch (error) {
    console.error("Failed to batch write transactions:", error);
    return { error: "Failed to process bulk upload." };
  }
}

export async function getTransactions(month?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
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

export async function getAllTransactions() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const transactions: any[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined = undefined;

  try {
    do {
      const response = (await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
          ExpressionAttributeValues: {
            ":pk": `USER#${userId}`,
            ":skPrefix": "TX#",
          },
          ScanIndexForward: false,
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      )) as any;
      if (response.Items) {
        transactions.push(...response.Items);
      }
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return { success: true, transactions };
  } catch (error) {
    console.error("Failed to fetch all transactions:", error);
    return { error: "Failed to retrieve financial data." };
  }
}
