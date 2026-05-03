"use server";

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { auth } from "@/auth";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import crypto from "crypto";
import {
  transactionSchema,
  TransactionInput,
} from "@/lib/validations/transaction";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// 1. Single Transaction Ingestion (Manual Entry)
export async function createTransaction(data: TransactionInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;
  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid transaction data." };

  const txId = crypto.randomUUID();
  const { description, amount, date, category } = parsed.data;

  try {
    await docClient.send(
      new PutCommand({
        TableName: Resource.BudgifyTable.name,
        Item: {
          // PK groups all transactions for the user. SK sorts them by date.
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
    return { success: true };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return { error: "Database error." };
  }
}
// 2. Batch Transaction Ingestion (CSV Upload)
export async function batchCreateTransactions(
  transactions: TransactionInput[],
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Extract ID to satisfy TypeScript's strict type checking
  const userId = session.user.id;

  // --- THIS SECTION WAS MISSING IN YOUR SCREENSHOT ---
  // Validate all incoming rows
  const validTransactions = transactions.filter(
    (tx) => transactionSchema.safeParse(tx).success,
  );
  if (validTransactions.length === 0)
    return { error: "No valid transactions found." };

  // Format into DynamoDB PutRequests
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
  // ---------------------------------------------------

  // THE CHUNKING ALGORITHM: DynamoDB only accepts 25 items per batch
  const chunkSize = 25;
  const batches = [];

  for (let i = 0; i < putRequests.length; i += chunkSize) {
    batches.push(putRequests.slice(i, i + chunkSize));
  }

  try {
    // Fire off all batches concurrently using Promise.all
    await Promise.all(
      batches.map((batch) =>
        docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [Resource.BudgifyTable.name]: batch,
            },
          }),
        ),
      ),
    );
    return { success: true, count: validTransactions.length };
  } catch (error) {
    console.error("Failed to batch write transactions:", error);
    return { error: "Failed to process bulk upload." };
  }
}
// 3. Fetch Transactions (Read Operation)
export async function getTransactions(month?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Extract ID to satisfy TypeScript's strict type checking
  const userId = session.user.id;

  // If a month is provided, we query only that month. Otherwise, we grab all transactions.
  const skPrefix = month ? `TX#${month}` : "TX#";

  try {
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: Resource.BudgifyTable.name,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          // Use the strongly-typed userId constant here
          ":pk": `USER#${userId}`,
          ":skPrefix": skPrefix,
        },
        ScanIndexForward: false,
      }),
    );

    return {
      success: true,
      transactions: Items || [],
    };
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return { error: "Failed to retrieve financial data." };
  }
}
