import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import bcrypt from "bcryptjs";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (typeof credentials.email !== "string" || typeof credentials.password !== "string") {
          return null;
        }

        try {
          const { Item } = await docClient.send(
            new GetCommand({
              TableName: (Resource as any).BudgifyUsersTable.name,
              Key: {
                pk: `USER#${credentials.email}`,
                sk: `PROFILE#${credentials.email}`,
              },
            })
          );

          if (!Item) {
            return null;
          }

          const passwordsMatch = await bcrypt.compare(credentials.password, Item.passwordHash);

          if (passwordsMatch) {
            return {
              id: Item.pk,
              email: Item.email,
            };
          }

          return null;
        } catch (error) {
          console.error("Failed to fetch user:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
});
