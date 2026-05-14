import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE_NAME = Resource.BudgifyTable.name;

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

function advanceNextRunDate(frequency: Frequency, dayOfMonth?: number, from?: string): string {
  const base = from ? new Date(from) : new Date();
  const d = new Date(base);

  switch (frequency) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      break;
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      if (dayOfMonth) d.setDate(Math.min(dayOfMonth, 28));
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }

  return d.toISOString().split("T")[0];
}

export async function handler() {
  const today = new Date().toISOString().split("T")[0];

  // Scan for all active recurring transactions due today or earlier
  const scanResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression:
        "#t = :type AND isActive = :active AND nextRunDate <= :today",
      ExpressionAttributeNames: { "#t": "type" },
      ExpressionAttributeValues: {
        ":type": "RECURRING",
        ":active": true,
        ":today": today,
      },
    }),
  );

  const items = scanResult.Items ?? [];
  console.log(`[processRecurring] Found ${items.length} due recurring transactions`);

  for (const item of items) {
    const userId = (item.pk as string).replace("USER#", "");
    const txId = randomUUID();
    const txDate = item.nextRunDate as string;

    // Write the generated transaction
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: item.pk,
          sk: `TX#${txDate}#${txId}`,
          id: txId,
          type: "TRANSACTION",
          description: item.description,
          amount: item.amount,
          date: txDate,
          category: item.category,
          transactionType: item.transactionType,
          accountId: item.accountId,
          createdAt: new Date().toISOString(),
          generatedBy: `RECURRING#${item.id}`,
        },
      }),
    );

    // Advance nextRunDate
    const nextRunDate = advanceNextRunDate(
      item.frequency as Frequency,
      item.dayOfMonth as number | undefined,
      txDate,
    );

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: item.pk, sk: `RECURRING#${item.id}` },
        UpdateExpression: "SET nextRunDate = :nextRunDate",
        ExpressionAttributeValues: { ":nextRunDate": nextRunDate },
      }),
    );

    console.log(
      `[processRecurring] Created TX#${txDate}#${txId} for user ${userId}, next run: ${nextRunDate}`,
    );
  }

  return { processed: items.length };
}
