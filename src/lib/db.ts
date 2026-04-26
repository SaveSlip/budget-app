import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Example data insertion using the securely bound Resource
export async function createUserRecord(email: string, passwordHash: string) {
  await docClient.send(
    new PutCommand({
      TableName: (Resource as any).BudgifyUsersTable.name,
      Item: {
        pk: `USER#${email}`,
        sk: `PROFILE#${email}`,
        email: email,
        passwordHash: passwordHash,
        createdAt: Date.now(),
      },
    }),
  );
}
