import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const token = params.token;

    console.log("Raw token from params:", token);
    console.log("Token decoded:", decodeURIComponent(token));
    console.log("Token length:", token.length);

    // Try both encoded and decoded versions
    const tokensToTry = [token, decodeURIComponent(token)].filter(
      (t, i, arr) => arr.indexOf(t) === i,
    );

    for (const tokenToTry of tokensToTry) {
      console.log("Trying token:", tokenToTry);

      const { Item: resetToken } = await docClient.send(
        new GetCommand({
          TableName: Resource.UsersTable.name,
          Key: {
            pk: `RESET#${tokenToTry}`,
            sk: `RESET#${tokenToTry}`,
          },
        }),
      );

      if (resetToken) {
        console.log("Found token in DB:", resetToken);

        // Check if token has expired
        const expiresAt = new Date(resetToken.expiresAt);
        console.log("Token expires at:", expiresAt);
        console.log("Current time:", new Date());

        if (expiresAt < new Date()) {
          console.log("Token has expired");
          return NextResponse.json(
            { error: "Reset token has expired" },
            { status: 400 },
          );
        }

        console.log("Token is valid");
        return NextResponse.json({ valid: true });
      }
    }

    console.log("Token not found in database");
    return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
  } catch (error) {
    console.error("Validate reset token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
