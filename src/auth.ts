import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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
        if (
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        try {
          const { Item } = await docClient.send(
            new GetCommand({
              TableName: Resource.BudgifyTable.name,
              Key: {
                pk: `USER#${credentials.email}`,
                sk: `PROFILE#${credentials.email}`,
              },
            }),
          );

          if (!Item) {
            return null;
          }

          const passwordsMatch = await bcrypt.compare(
            credentials.password,
            Item.passwordHash,
          );

          if (!passwordsMatch) return null;

          // Block sign-in for unverified email addresses
          if (!Item.emailVerified) return null;

          return {
            id: Item.id,
            email: Item.email,
            name: (Item.name as string) ?? null,
          };
        } catch (error) {
          console.error("Failed to fetch user:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: sessionUpdate }) {
      if (user) {
        token.id = user.id as string;
        token.activeUserId = user.id as string;
        token.name = user.name ?? null;

        // Resolve household role at login time
        const linkResult = await docClient.send(
          new QueryCommand({
            TableName: Resource.BudgifyTable.name,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
            ExpressionAttributeValues: {
              ":pk": `USER#${user.id}`,
              ":prefix": "HOUSEHOLD_MEMBER#",
            },
            Limit: 1,
          }),
        );
        const link = linkResult.Items?.[0];
        token.role = (link?.role as "MASTER" | "MEMBER") ?? null;
        token.householdId = (link?.householdId as string) ?? null;
        token.canViewHousehold = (link?.canViewHousehold as boolean) ?? false;
      }
      if (trigger === "update" && sessionUpdate?.activeUserId !== undefined) {
        token.activeUserId = sessionUpdate.activeUserId;
      }
      if (trigger === "update" && sessionUpdate?.name !== undefined) {
        token.name = sessionUpdate.name;
      }
      if (trigger === "update" && sessionUpdate?.refreshHousehold) {
        const refreshResult = await docClient.send(
          new QueryCommand({
            TableName: Resource.BudgifyTable.name,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
            ExpressionAttributeValues: {
              ":pk": `USER#${token.id}`,
              ":prefix": "HOUSEHOLD_MEMBER#",
            },
            Limit: 1,
          }),
        );
        const refreshedLink = refreshResult.Items?.[0];
        token.role = (refreshedLink?.role as "MASTER" | "MEMBER") ?? null;
        token.householdId = (refreshedLink?.householdId as string) ?? null;
        token.canViewHousehold =
          (refreshedLink?.canViewHousehold as boolean) ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
        session.user.activeUserId = (token.activeUserId ?? token.id) as string;
        session.user.role = (token.role as "MASTER" | "MEMBER") ?? null;
        session.user.householdId = (token.householdId as string) ?? null;
        session.user.canViewHousehold = (token.canViewHousehold as boolean) ?? false;
        session.user.name = (token.name as string) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});
