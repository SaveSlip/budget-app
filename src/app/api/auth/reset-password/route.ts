import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { z } from "zod";
import bcrypt from "bcryptjs";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // Get reset token from database
    const { Item: resetToken } = await docClient.send(
      new GetCommand({
        TableName: Resource.UsersTable.name,
        Key: {
          pk: `RESET#${token}`,
          sk: `RESET#${token}`,
        },
      }),
    );

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid reset token" },
        { status: 400 }
      );
    }

    // Check if token has expired
    const expiresAt = new Date(resetToken.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Reset token has expired" },
        { status: 400 }
      );
    }

    const email = resetToken.email;

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    await docClient.send(
      new UpdateCommand({
        TableName: Resource.UsersTable.name,
        Key: {
          pk: `USER#${email}`,
          sk: `PROFILE#${email}`,
        },
        UpdateExpression: "SET passwordHash = :password, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":password": hashedPassword,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );

    // Delete the reset token
    await docClient.send(
      new DeleteCommand({
        TableName: Resource.UsersTable.name,
        Key: {
          pk: `RESET#${token}`,
          sk: `RESET#${token}`,
        },
      }),
    );

    return NextResponse.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}