// src/app/actions/auth.ts
"use server";

import bcrypt from "bcryptjs";
import {
  signupSchema,
  SignupInput,
  resetPasswordSchema,
  ResetPasswordInput,
  forgotPasswordSchema,
  ForgotPasswordInput,
} from "@/lib/validations/auth";
import { createUserRecord, docClient, TABLE_NAME } from "@/lib/db";
import { signOut } from "@/auth";
import { redirect } from "next/navigation";
import {
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";

const sesClient = new SESClient({});

export async function registerUser(data: SignupInput) {
  try {
    const parsed = signupSchema.safeParse(data);
    if (!parsed.success) {
      return { error: "Invalid input data" };
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const userId = crypto.randomUUID();

    const dbResult = await createUserRecord({
      id: userId,
      email: parsed.data.email,
      hashedPassword: hashedPassword,
    });

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

export async function forgotPasswordAction(data: ForgotPasswordInput) {
  try {
    const parsed = forgotPasswordSchema.safeParse(data);
    if (!parsed.success) return { error: "Invalid email provided." };

    const email = parsed.data.email;

    const { Item: user } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
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

    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `RESET#${resetToken}`,
          sk: `RESET#${resetToken}`,
          email,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
        },
      }),
    );

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
                    <a href="${resetLink}" style="background-color: #a8471f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
                  </p>
                  <p><strong>Important:</strong> This link will expire in 15 minutes for security reasons.</p>
                  <p>If you did not request this password reset, please ignore this email.</p>
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
      if (process.env.NODE_ENV !== "production") {
        return { success: true, resetLink };
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
    const tokensToTry = [...new Set([token, decodeURIComponent(token)])];

    for (const tokenToTry of tokensToTry) {
      const { Item: resetToken } = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
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
        TableName: TABLE_NAME,
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
        TableName: TABLE_NAME,
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
        TableName: TABLE_NAME,
        Key: { pk: `RESET#${decodedToken}`, sk: `RESET#${decodedToken}` },
      }),
    );

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { error: "Internal server error" };
  }
}
