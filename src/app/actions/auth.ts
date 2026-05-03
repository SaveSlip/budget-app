// src/app/actions/auth.ts
"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  signupSchema,
  SignupInput,
  resetPasswordSchema,
  ResetPasswordInput,
  forgotPasswordSchema,
  ForgotPasswordInput,
} from "@/lib/validations/auth";
import { createUserRecord } from "@/lib/db";
import { signOut } from "@/auth";
import { redirect } from "next/navigation";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";

// Initialize AWS Clients
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sesClient = new SESClient({});

// ==========================================
// REGISTRATION & AUTH ACTIONS
// ==========================================

export async function registerUser(data: SignupInput) {
  try {
    const parsed = signupSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid input data" };
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const userId = crypto.randomUUID();

    // Capture the response from our updated database function
    const dbResult = await createUserRecord({
      id: userId,
      email: parsed.data.email,
      hashedPassword: hashedPassword,
    });

    // If the database rejected the creation (e.g., duplicate email), return that error to the form
    if (dbResult.error) {
      return { error: dbResult.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to register user:", error);
    return { error: "Internal Server Error" };
  }
}

export async function logout() {
  await signOut();
  redirect("/signin");
}

// ==========================================
// PASSWORD RESET ACTIONS
// ==========================================

export async function forgotPasswordAction(data: ForgotPasswordInput) {
  try {
    const parsed = forgotPasswordSchema.safeParse(data);
    if (!parsed.success) return { error: "Invalid email provided." };

    const email = parsed.data.email;

    // 1. Check if user exists (We don't return an error if they don't, for security)
    const { Item: user } = await docClient.send(
      new GetCommand({
        // Change this from Resource.UsersTable.name to your primary table
        TableName: Resource.BudgifyTable.name,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );

    if (!user) {
      return {
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      };
    }

    // 2. Generate secure token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // 3. Store token in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: Resource.BudgifyTable.name,
        Item: {
          pk: `RESET#${resetToken}`,
          sk: `RESET#${resetToken}`,
          email,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
        },
      }),
    );

    // 4. Send Email via AWS SES
    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

    try {
      await sesClient.send(
        new SendEmailCommand({
          Source: Resource.EmailIdentity.sender,
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: { Data: "Password Reset - Budgify", Charset: "UTF-8" },
            Body: {
              Html: {
                Data: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Password Reset Request</h2>
                  <p>Hello,</p>
                  <p>You requested a password reset for your Budgify account. Click the link below to reset your password:</p>
                  <p style="margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
                  </p>
                  <p><strong>Important:</strong> This link will expire in 15 minutes for security reasons.</p>
                  <p>If you didn't request this password reset, please ignore this email.</p>
                </div>
              `,
                Charset: "UTF-8",
              },
            },
          },
        }),
      );
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // In development, we still want to succeed so we can test the link
      if (process.env.NODE_ENV !== "production") {
        return { success: true, resetLink }; // Return link to console for local testing
      }
      return { error: "Failed to dispatch email." };
    }

    return {
      success: true,
      resetLink: process.env.NODE_ENV !== "production" ? resetLink : undefined,
    };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { error: "Internal server error" };
  }
}

export async function validateResetTokenAction(token: string) {
  try {
    const tokensToTry = [token, decodeURIComponent(token)].filter(
      (t, i, arr) => arr.indexOf(t) === i,
    );

    for (const tokenToTry of tokensToTry) {
      const { Item: resetToken } = await docClient.send(
        new GetCommand({
          TableName: Resource.BudgifyTable.name, // <-- FIXED SYNTAX ERROR HERE
          Key: { pk: `RESET#${tokenToTry}`, sk: `RESET#${tokenToTry}` },
        }),
      );

      if (resetToken) {
        const expiresAt = new Date(resetToken.expiresAt);
        if (expiresAt < new Date()) return { error: "Reset token has expired" };
        return { success: true };
      }
    }
    return { error: "Invalid reset token" };
  } catch (error) {
    console.error("Token validation error:", error);
    return { error: "Internal server error" };
  }
}

export async function resetPasswordAction(
  token: string,
  data: ResetPasswordInput,
) {
  try {
    const parsed = resetPasswordSchema.safeParse(data);
    if (!parsed.success) return { error: "Invalid input data" };

    const decodedToken = decodeURIComponent(token);

    const { Item: resetToken } = await docClient.send(
      new GetCommand({
        TableName: Resource.BudgifyTable.name,
        Key: { pk: `RESET#${decodedToken}`, sk: `RESET#${decodedToken}` },
      }),
    );

    if (!resetToken) return { error: "Invalid or expired reset token" };
    if (new Date(resetToken.expiresAt) < new Date())
      return { error: "Reset token has expired" };

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const email = resetToken.email;

    await docClient.send(
      new UpdateCommand({
        TableName: Resource.BudgifyTable.name,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
        UpdateExpression:
          "SET passwordHash = :password, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":password": hashedPassword,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );

    await docClient.send(
      new DeleteCommand({
        TableName: Resource.BudgifyTable.name,
        Key: { pk: `RESET#${decodedToken}`, sk: `RESET#${decodedToken}` },
      }),
    );

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { error: "Internal server error" };
  }
}
