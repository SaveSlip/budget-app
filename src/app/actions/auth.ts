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
  changePasswordSchema,
  ChangePasswordInput,
} from "@/lib/validations/auth";
import { createUserRecord, deletePartition, docClient, TABLE_NAME } from "@/lib/db";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import {
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";

const sesClient = new SESClient({ region: process.env.AWS_REGION ?? "us-east-1" });

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

export async function deleteAccount(): Promise<{ error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" };

    const { id: userId, email } = session.user;

    await deletePartition(`USER#${userId}`);
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );

    await signOut({ redirect: false });
  } catch (error) {
    console.error("Delete account error:", error);
    return { error: "Failed to delete account. Please try again." };
  }

  redirect("/signin");
}

export async function changePasswordAction(
  data: ChangePasswordInput,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const parsed = changePasswordSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
      return { error: firstError };
    }

    const session = await auth();
    if (!session?.user?.email) return { error: "Unauthorized" };

    const email = session.user.email;

    const { Item: user } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );

    if (!user?.passwordHash) return { error: "User not found." };

    const isMatch = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) return { error: "Current password is incorrect." };

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
        UpdateExpression: "SET passwordHash = :password, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":password": hashedPassword,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );

    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return { error: "Internal server error" };
  }
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
          "SET passwordHash = :password, updatedAt = :updatedAt, emailVerified = :verified",
        ExpressionAttributeValues: {
          ":password": hashedPassword,
          ":updatedAt": new Date().toISOString(),
          ":verified": true,
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

export async function sendVerificationEmail(
  email: string,
): Promise<{ success?: true; verifyLink?: string; error?: string }> {
  try {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const baseUrl =
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const verifyLink = `${baseUrl}/verify-email/${token}`;

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `VERIFY#${token}`,
          sk: `VERIFY#${token}`,
          email,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
        },
      }),
    );

    try {
      await sesClient.send(
        new SendEmailCommand({
          Source: Resource.EmailIdentity.sender,
          Destination: { ToAddresses: [email] },
          Message: {
            Subject: {
              Data: "Verify your email — Budgify",
              Charset: "UTF-8",
            },
            Body: {
              Html: {
                Data: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Welcome to Budgify!</h2>
                  <p>Hello,</p>
                  <p>Thanks for signing up. Please verify your email address to activate your account:</p>
                  <p style="margin: 30px 0;">
                    <a href="${verifyLink}" style="background-color: #a8471f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
                  </p>
                  <p><strong>This link expires in 24 hours.</strong></p>
                  <p>If you did not create a Budgify account, you can safely ignore this email.</p>
                </div>
              `,
                Charset: "UTF-8",
              },
            },
          },
        }),
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      if (process.env.NODE_ENV !== "production") {
        return { success: true, verifyLink };
      }
      return { error: "Failed to send verification email. Please try again." };
    }

    return {
      success: true,
      verifyLink:
        process.env.NODE_ENV !== "production" ? verifyLink : undefined,
    };
  } catch (error) {
    console.error("Send verification email error:", error);
    return { error: "Internal server error" };
  }
}

export async function resendVerificationEmail(
  email: string,
): Promise<{ success?: true; error?: string }> {
  try {
    const { Item: user } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
      }),
    );
    if (!user) return { error: "No account found with that email address." };
    if (user.emailVerified)
      return { error: "This email is already verified. Please sign in." };

    return sendVerificationEmail(email);
  } catch (error) {
    console.error("Resend verification email error:", error);
    return { error: "Internal server error" };
  }
}

export async function verifyEmailToken(
  token: string,
): Promise<{ success?: true; error?: string }> {
  try {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `VERIFY#${token}`, sk: `VERIFY#${token}` },
      }),
    );

    if (!Item) return { error: "Invalid verification link." };
    if (new Date(Item.expiresAt) < new Date())
      return {
        error: "Verification link has expired. Please request a new one.",
      };

    const email = Item.email as string;

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${email}`, sk: `PROFILE#${email}` },
        UpdateExpression: "SET emailVerified = :verified, updatedAt = :now",
        ExpressionAttributeValues: {
          ":verified": true,
          ":now": new Date().toISOString(),
        },
      }),
    );

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: `VERIFY#${token}`, sk: `VERIFY#${token}` },
      }),
    );

    return { success: true };
  } catch (error) {
    console.error("Verify email token error:", error);
    return { error: "Internal server error" };
  }
}
